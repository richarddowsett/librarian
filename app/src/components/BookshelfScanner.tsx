import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import {
  getPresignedUploadUrl,
  uploadImageToS3,
  analyzeBookshelfImage,
  BookshelfCandidateBook,
} from '../services/bookshelfAi';
import { BookshelfReviewModal } from './BookshelfReviewModal';
import { useAuth } from '../context/AuthContext';

export interface BookshelfScannerProps {
  onBookCataloged?: () => void;
}

export const BookshelfScanner: React.FC<BookshelfScannerProps> = ({ onBookCataloged }) => {
  const { user, authToken } = useAuth();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [guardrailAlert, setGuardrailAlert] = useState<string | null>(null);

  // Review Modal State
  const [detectedBooks, setDetectedBooks] = useState<BookshelfCandidateBook[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);

  // Native & Web Refs
  const cameraRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [webCamActive, setWebCamActive] = useState<boolean>(false);
  const [webCamError, setWebCamError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasCameraPermission(status === 'granted');
      } else {
        setHasCameraPermission(true);
      }
    })();
  }, []);

  // Web Webcam initialization
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (Platform.OS === 'web' && !capturedImageUri) {
      (async () => {
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
            });
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              await videoRef.current.play().catch(() => {});
              setWebCamActive(true);
              setWebCamError(null);
            }
          }
        } catch (err) {
          console.warn('Webcam stream access warning:', err);
          setWebCamError('Webcam access is restricted or unavailable.');
          setWebCamActive(false);
        }
      })();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [Platform.OS, capturedImageUri]);

  const processBookshelfPhoto = async (imageUri: string, fileName: string = 'bookshelf.jpg') => {
    setCapturedImageUri(imageUri);
    setIsAnalyzing(true);
    setGuardrailAlert(null);
    setStatusMessage('1/3 Requesting secure upload URL...');

    const apiOptions = {
      authToken: authToken || undefined,
      userId: user?.uid,
    };

    try {
      // Step 1: Request presigned S3 URL
      const presigned = await getPresignedUploadUrl(fileName, 'image/jpeg', apiOptions);

      // Step 2: Upload image payload directly to S3
      setStatusMessage('2/3 Uploading image to S3 bucket...');
      const uploadOk = await uploadImageToS3(presigned.uploadUrl, imageUri, 'image/jpeg');

      if (!uploadOk) {
        setIsAnalyzing(false);
        setGuardrailAlert('Failed to upload photo to S3. Please try again.');
        return;
      }

      // Step 3: Trigger Gemini Vision AI analysis
      setStatusMessage('3/3 Analyzing bookshelf spines with Gemini AI...');
      const result = await analyzeBookshelfImage(presigned.s3Key, apiOptions);

      setIsAnalyzing(false);

      if (!result.isBookshelf) {
        // Guardrail error handling: photo does not contain a bookshelf
        setGuardrailAlert(
          result.message ||
            'No bookshelf detected in photo. Please ensure your photo clearly shows book spines on a shelf.'
        );
      } else {
        // Success: set candidate books & open review modal
        setDetectedBooks(result.books || []);
        setIsReviewModalOpen(true);
      }
    } catch (err: any) {
      console.error('Bookshelf processing error:', err);
      setIsAnalyzing(false);
      setGuardrailAlert('An unexpected error occurred during bookshelf analysis. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    setGuardrailAlert(null);

    if (Platform.OS === 'web') {
      if (videoRef.current) {
        try {
          const video = videoRef.current;
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            await processBookshelfPhoto(dataUrl, `shelf-web-${Date.now()}.jpg`);
          }
        } catch (e) {
          setGuardrailAlert('Could not capture webcam snapshot. Try uploading a photo instead.');
        }
      } else {
        // Trigger file input fallback
        fileInputRef.current?.click();
      }
    } else if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
        if (photo?.uri) {
          await processBookshelfPhoto(photo.uri, `shelf-native-${Date.now()}.jpg`);
        }
      } catch (e) {
        setGuardrailAlert('Camera snapshot failed. Please retry.');
      }
    }
  };

  const handleFileChange = (e: any) => {
    const file = e.target?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const uri = event.target?.result as string;
        if (uri) {
          processBookshelfPhoto(uri, file.name || 'uploaded-bookshelf.jpg');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRetake = () => {
    setCapturedImageUri(null);
    setGuardrailAlert(null);
    setIsAnalyzing(false);
    setStatusMessage('');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, alignItems: 'center' }}>
      {/* Hidden File Input for Gallery / Device Upload */}
      {Platform.OS === 'web' && (
        <input
          type="file"
          ref={fileInputRef as any}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      )}

      <View style={{ width: '100%', maxWidth: 640 }}>
        {/* Header */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Ionicons name="sparkles" size={24} color="#38bdf8" />
            <Text style={{ color: '#f8fafc', fontSize: 24, fontWeight: '800' }}>
              Bookshelf Photo AI Scanner
            </Text>
          </View>
          <Text style={{ color: '#94a3b8', fontSize: 14 }}>
            Take or upload a photo of your bookshelf. Our Gemini Vision AI extracts book titles &
            authors automatically!
          </Text>
        </View>

        {/* Guardrail Feedback Alert Box */}
        {guardrailAlert && (
          <View
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              borderColor: '#ef4444',
              borderWidth: 1.5,
              padding: 16,
              borderRadius: 16,
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <Ionicons name="warning-outline" size={24} color="#fca5a5" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fca5a5', fontSize: 15, fontWeight: '800', marginBottom: 4 }}>
                  Bookshelf Detection Warning
                </Text>
                <Text style={{ color: '#f8fafc', fontSize: 14, lineHeight: 20 }}>
                  {guardrailAlert}
                </Text>

                <TouchableOpacity
                  onPress={handleRetake}
                  style={{
                    backgroundColor: '#ef4444',
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                    alignSelf: 'flex-start',
                    marginTop: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Ionicons name="refresh-outline" size={16} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>
                    Retake / Try Another Photo
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Camera / Image Preview Box */}
        <View
          style={{
            height: 320,
            backgroundColor: '#0f172a',
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: isAnalyzing ? '#38bdf8' : '#334155',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            marginBottom: 20,
          }}
        >
          {capturedImageUri ? (
            /* Image Preview Mode with Scanning Overlay */
            <View style={{ width: '100%', height: '100%', position: 'relative' }}>
              <Image
                source={{ uri: capturedImageUri }}
                style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
              />

              {/* Scanning Animation & Status Overlay */}
              {isAnalyzing && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20,
                  }}
                >
                  <ActivityIndicator size="large" color="#38bdf8" style={{ marginBottom: 16 }} />
                  <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '800', textAlign: 'center' }}>
                    Scanning Bookshelf Photo...
                  </Text>
                  <Text style={{ color: '#38bdf8', fontSize: 14, fontWeight: '600', marginTop: 6, textAlign: 'center' }}>
                    {statusMessage}
                  </Text>
                </View>
              )}
            </View>
          ) : Platform.OS !== 'web' && hasCameraPermission ? (
            /* Native Expo Camera View */
            <CameraView ref={cameraRef} style={{ width: '100%', height: '100%' }}>
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                }}
              >
                <View
                  style={{
                    width: '85%',
                    height: '75%',
                    borderWidth: 2,
                    borderColor: 'rgba(56, 189, 248, 0.6)',
                    borderStyle: 'dashed',
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="camera-outline" size={40} color="rgba(255,255,255,0.7)" />
                  <Text style={{ color: '#ffffff', fontSize: 13, marginTop: 8, fontWeight: '600' }}>
                    Align book spines inside frame
                  </Text>
                </View>
              </View>
            </CameraView>
          ) : Platform.OS === 'web' ? (
            /* Web HTML5 Webcam Live View */
            <View
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: webCamActive ? 'block' : 'none',
                }}
              />

              {!webCamActive && (
                <View style={{ alignItems: 'center', padding: 24 }}>
                  <Ionicons name="images-outline" size={56} color="#0284c7" />
                  <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '700', marginTop: 12 }}>
                    Upload or Capture Photo
                  </Text>
                  <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 6, maxWidth: 360 }}>
                    Select an existing photo of your bookshelf or use your device camera.
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={{ alignItems: 'center', padding: 24 }}>
              <Ionicons name="camera-outline" size={56} color="#0284c7" />
              <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '700', marginTop: 12 }}>
                Camera Unavailable
              </Text>
            </View>
          )}
        </View>

        {/* Action Button Controls */}
        <View style={{ gap: 12 }}>
          {capturedImageUri ? (
            <TouchableOpacity
              onPress={handleRetake}
              disabled={isAnalyzing}
              style={{
                backgroundColor: '#1e293b',
                borderColor: '#334155',
                borderWidth: 1,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="refresh-outline" size={20} color="#38bdf8" />
              <Text style={{ color: '#38bdf8', fontWeight: '800', fontSize: 15 }}>
                Retake / Select Another Photo
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={handleTakePhoto}
                style={{
                  flex: 1,
                  backgroundColor: '#0284c7',
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="camera" size={20} color="#ffffff" />
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }}>
                  Take Photo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === 'web' && fileInputRef.current) {
                    fileInputRef.current.click();
                  } else {
                    // Dev mock image selection for web/native testing
                    processBookshelfPhoto(
                      'https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg',
                      'mock-bookshelf.jpg'
                    );
                  }
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#1e293b',
                  borderColor: '#334155',
                  borderWidth: 1,
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="images-outline" size={20} color="#38bdf8" />
                <Text style={{ color: '#38bdf8', fontWeight: '800', fontSize: 15 }}>
                  Upload Image
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Review Modal */}
        <BookshelfReviewModal
          visible={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          initialBooks={detectedBooks}
          onSuccessAdded={(count) => {
            if (onBookCataloged) onBookCataloged();
          }}
        />
      </View>
    </ScrollView>
  );
};
