import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { user, authToken } = useAuth();

  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [guardrailAlert, setGuardrailAlert] = useState<string | null>(null);

  // Review Modal State
  const [detectedBooks, setDetectedBooks] = useState<BookshelfCandidateBook[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleLaunchCamera = async () => {
    setGuardrailAlert(null);
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.setAttribute('capture', 'environment');
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const uri = event.target?.result as string;
              if (uri) {
                setCapturedImageUri(uri);
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } else {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setGuardrailAlert('Camera permission is required to take a photo.');
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
        });

        if (!result.canceled && result.assets?.[0]?.uri) {
          setCapturedImageUri(result.assets[0].uri);
        }
      }
    } catch (err) {
      console.error('Error launching camera:', err);
      setGuardrailAlert('Failed to launch camera.');
    }
  };

  const handleLaunchGallery = async () => {
    setGuardrailAlert(null);
    try {
      if (Platform.OS === 'web') {
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setGuardrailAlert('Media library permission is required to choose a photo.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
        });

        if (!result.canceled && result.assets?.[0]?.uri) {
          setCapturedImageUri(result.assets[0].uri);
        }
      }
    } catch (err) {
      console.error('Error launching library:', err);
      setGuardrailAlert('Failed to open gallery.');
    }
  };

  const handleFileChange = (e: any) => {
    const file = e.target?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const uri = event.target?.result as string;
        if (uri) {
          setCapturedImageUri(uri);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const processBookshelfPhoto = async () => {
    if (!capturedImageUri) return;

    setIsAnalyzing(true);
    setGuardrailAlert(null);
    setStatusMessage('1/3 Requesting secure upload URL...');

    const apiOptions = {
      authToken: authToken || undefined,
      userId: user?.uid,
    };

    const fileName = `shelf-${Date.now()}.jpg`;

    try {
      // Step 1: Request presigned S3 URL
      const presigned = await getPresignedUploadUrl(fileName, 'image/jpeg', apiOptions);

      // Step 2: Upload image payload directly to S3
      setStatusMessage('2/3 Uploading image to S3 bucket...');
      const uploadOk = await uploadImageToS3(presigned.uploadUrl, capturedImageUri, 'image/jpeg');

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

  const handleClearPhoto = () => {
    setCapturedImageUri(null);
    setGuardrailAlert(null);
    setIsAnalyzing(false);
    setStatusMessage('');
  };

  const renderHeader = () => (
    <View style={{ marginBottom: isLandscape ? 0 : 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Ionicons name="sparkles" size={24} color="#38bdf8" />
        <Text style={{ color: '#f8fafc', fontSize: 24, fontWeight: '800' }}>
          Bookshelf Photo AI Scanner
        </Text>
      </View>
      <Text style={{ color: '#94a3b8', fontSize: 14 }}>
        Upload or take a photo of your bookshelf. Our Gemini Vision AI extracts book titles &
        authors automatically!
      </Text>
    </View>
  );

  const renderGuardrail = () => guardrailAlert && (
    <View
      style={{
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        borderColor: '#ef4444',
        borderWidth: 1.5,
        padding: 16,
        borderRadius: 16,
        marginBottom: isLandscape ? 0 : 20,
        width: '100%',
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
            onPress={handleClearPhoto}
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
              Clear / Try Another Photo
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderPreviewBox = () => (
    <View
      style={{
        height: isLandscape ? 320 : 320,
        aspectRatio: isLandscape ? 16 / 9 : undefined,
        width: '100%',
        backgroundColor: '#0f172a',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: isAnalyzing ? '#38bdf8' : '#334155',
        borderStyle: capturedImageUri ? 'solid' : 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginBottom: isLandscape ? 0 : 20,
        padding: capturedImageUri ? 0 : 24,
      }}
    >
      {capturedImageUri ? (
        /* Image Preview Mode with Scanning Overlay */
        <View style={{ width: '100%', height: '100%', position: 'relative' }}>
          <Image
            source={{ uri: capturedImageUri }}
            style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
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
      ) : (
        /* Empty Upload Zone State */
        <TouchableOpacity
          onPress={handleLaunchGallery}
          style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
        >
          <Ionicons name="cloud-upload-outline" size={56} color="#0284c7" />
          <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>
            No Photo Selected
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 6, maxWidth: 360 }}>
            Click to open your gallery, or use the buttons below to upload or take a bookshelf photo.
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderActions = () => (
    <View style={{ gap: 12, width: '100%' }}>
      {capturedImageUri ? (
        <View style={{ gap: 12, width: '100%' }}>
          <TouchableOpacity
            onPress={processBookshelfPhoto}
            disabled={isAnalyzing}
            style={{
              backgroundColor: '#0284c7',
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
            }}
          >
            {isAnalyzing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#ffffff" />
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }}>
                  Scan Bookshelf with Gemini AI
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleClearPhoto}
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
              width: '100%',
            }}
          >
            <Ionicons name="refresh-outline" size={20} color="#38bdf8" />
            <Text style={{ color: '#38bdf8', fontWeight: '800', fontSize: 15 }}>
              Choose a Different Photo
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
          <TouchableOpacity
            onPress={handleLaunchCamera}
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
            onPress={handleLaunchGallery}
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
              Choose from Gallery
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

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

      <View style={{ width: '100%', maxWidth: isLandscape ? 960 : 640 }}>
        {isLandscape ? (
          <View style={{ flexDirection: 'row', gap: 24, width: '100%', alignItems: 'flex-start' }}>
            {/* Left Side: Camera / Image Preview Box */}
            <View style={{ flex: 1.3, width: '100%' }}>
              {renderPreviewBox()}
            </View>

            {/* Right Side: Header + Warnings + Actions */}
            <View style={{ flex: 1, width: '100%', gap: 20 }}>
              {renderHeader()}
              {renderGuardrail()}
              {renderActions()}
            </View>
          </View>
        ) : (
          <View style={{ width: '100%' }}>
            {renderHeader()}
            {renderGuardrail()}
            {renderPreviewBox()}
            {renderActions()}
          </View>
        )}

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
