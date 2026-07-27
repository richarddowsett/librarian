import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { fetchBookByISBN, OpenLibraryBookResult } from '../services/openLibrary';
import { useLibrary } from '../context/LibraryContext';
import { Ionicons } from '@expo/vector-icons';
import { BookFormModal } from './BookFormModal';

interface CameraScannerProps {
  onBookCataloged?: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onBookCataloged }) => {
  const { addBook } = useLibrary();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [manualIsbn, setManualIsbn] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [scannedResult, setScannedResult] = useState<OpenLibraryBookResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [fallbackBookData, setFallbackBookData] = useState<any>(null);

  // Web Desktop Webcam state & refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [webCamActive, setWebCamActive] = useState<boolean>(false);
  const [webCamError, setWebCamError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } else {
        setHasPermission(true);
      }
    })();
  }, []);

  // Web Camera Stream setup
  useEffect(() => {
    let stream: MediaStream | null = null;
    let scanInterval: any = null;

    if (Platform.OS === 'web' && isScanning) {
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
        } catch (err: any) {
          console.warn('Webcam stream access error:', err);
          setWebCamError('Webcam access was denied or not available. Please allow camera permissions in your browser.');
          setWebCamActive(false);
        }
      })();

      // BarcodeDetector interval loop if available in browser
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
          });

          scanInterval = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === 4 && isScanning) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const detectedIsbn = barcodes[0].rawValue;
                  if (detectedIsbn) {
                    handleBarCodeScanned(detectedIsbn);
                  }
                }
              } catch (e) {
                // Ignore detection frame errors
              }
            }
          }, 400);
        } catch (e) {
          console.warn('BarcodeDetector initialization error:', e);
        }
      }
    }

    return () => {
      if (scanInterval) clearInterval(scanInterval);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isScanning, Platform.OS]);

  const handleBarCodeScanned = async (isbn: string) => {
    if (!isScanning || isSearching) return;
    setIsScanning(false);
    setManualIsbn(isbn);
    await lookupISBN(isbn);
  };

  const lookupISBN = async (targetIsbn: string) => {
    const cleanIsbn = targetIsbn.replace(/[- ]/g, '').trim();
    if (!cleanIsbn) {
      setSearchError('Please enter a valid ISBN code.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setScannedResult(null);

    try {
      const bookData = await fetchBookByISBN(cleanIsbn);
      if (bookData) {
        setScannedResult(bookData);
      } else {
        setSearchError(`No match found in Open Library for ISBN: ${cleanIsbn}. You can create a manual entry below.`);
        setFallbackBookData({ isbn: cleanIsbn });
      }
    } catch (err: any) {
      setSearchError('Network error looking up ISBN. Please try manual entry.');
      setFallbackBookData({ isbn: cleanIsbn });
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirmAdd = async () => {
    if (!scannedResult) return;

    const result = await addBook({
      title: scannedResult.title,
      authors: scannedResult.authors,
      isbn: scannedResult.isbn,
      coverUrl: scannedResult.coverUrl,
      publisher: scannedResult.publisher,
      publishDate: scannedResult.publishDate,
      pageCount: scannedResult.pageCount,
      readStatus: 'unread',
      seriesName: scannedResult.seriesName || null,
      seriesVolumeNumber: scannedResult.seriesVolumeNumber || null,
    });

    if (result.success) {
      alert(`Success! "${scannedResult.title}" has been added to your library.`);
      setScannedResult(null);
      setIsScanning(true);
      if (onBookCataloged) onBookCataloged();
    } else {
      setSearchError(result.error || 'Failed to catalog book');
    }
  };

  const QUICK_ISBN_PRESETS = [
    { label: 'Harry Potter 7', isbn: '9780545010221' },
    { label: 'Mistborn', isbn: '9780765311788' },
    { label: 'Project Hail Mary', isbn: '9780593135204' },
    { label: 'Dune', isbn: '9780441172719' },
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 640 }}>
        {/* Scanner View Header */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: '#f8fafc', fontSize: 24, fontWeight: '800', marginBottom: 4 }}>
            ISBN Barcode Scanner
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 14 }}>
            Point your device or desktop webcam at the book barcode, or enter the ISBN number manually below.
          </Text>
        </View>

        {/* Camera Scanner Container */}
        <View
          style={{
            height: 320,
            backgroundColor: '#0f172a',
            borderRadius: 20,
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: isScanning ? '#0284c7' : '#334155',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            marginBottom: 20,
          }}
        >
          {Platform.OS !== 'web' && hasPermission ? (
            /* Native Expo Camera View */
            <CameraView
              style={{ width: '100%', height: '100%' }}
              enableTorch={torchEnabled}
              onBarcodeScanned={
                isScanning ? ({ data }: { data: string }) => handleBarCodeScanned(data) : undefined
              }
            >
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                }}
              >
                <View
                  style={{
                    width: 240,
                    height: 140,
                    borderWidth: 2,
                    borderColor: '#38bdf8',
                    borderRadius: 16,
                    backgroundColor: 'rgba(56, 189, 248, 0.05)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ width: '80%', height: 2, backgroundColor: '#ef4444' }} />
                </View>
                <Text style={{ color: '#ffffff', fontSize: 12, marginTop: 10, fontWeight: '600' }}>
                  Position barcode inside the target box
                </Text>
              </View>
            </CameraView>
          ) : Platform.OS === 'web' ? (
            /* Web Desktop Live HTML5 Webcam Stream */
            <View style={{ width: '100%', height: '100%', position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
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
                  <Ionicons name="camera-outline" size={56} color="#0284c7" />
                  <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '700', marginTop: 12 }}>
                    Webcam Scanner Initializing...
                  </Text>
                  {webCamError ? (
                    <Text style={{ color: '#fca5a5', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
                      {webCamError}
                    </Text>
                  ) : (
                    <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 6, maxWidth: 360 }}>
                      Please allow browser webcam permissions to scan book barcodes directly with your desktop camera.
                    </Text>
                  )}
                </View>
              )}

              {/* Web Reticle Overlay */}
              {webCamActive && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                  }}
                >
                  <View
                    style={{
                      width: 260,
                      height: 150,
                      borderWidth: 2,
                      borderColor: '#38bdf8',
                      borderRadius: 16,
                      backgroundColor: 'rgba(56, 189, 248, 0.08)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ width: '80%', height: 2, backgroundColor: '#ef4444' }} />
                  </View>
                  <Text style={{ color: '#ffffff', fontSize: 12, marginTop: 10, fontWeight: '600' }}>
                    Hold book barcode up to webcam
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

          {/* Controls Bar */}
          <View
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              flexDirection: 'row',
              gap: 8,
            }}
          >
            {Platform.OS !== 'web' && (
              <TouchableOpacity
                onPress={() => setTorchEnabled(!torchEnabled)}
                style={{
                  backgroundColor: torchEnabled ? '#f59e0b' : 'rgba(15, 23, 42, 0.8)',
                  padding: 10,
                  borderRadius: 20,
                }}
              >
                <Ionicons name="flash-outline" size={18} color="#ffffff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setIsScanning(!isScanning)}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Ionicons name={isScanning ? 'pause' : 'play'} size={16} color="#38bdf8" />
              <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '700' }}>
                {isScanning ? 'Scanning Active' : 'Resume Scan'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Manual ISBN Numeric Fallback Form */}
        <View
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: '#334155',
            marginBottom: 20,
          }}
        >
          <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
            Manual Numeric ISBN Search
          </Text>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            <TextInput
              value={manualIsbn}
              onChangeText={setManualIsbn}
              placeholder="Enter 10 or 13-digit ISBN (e.g. 9780545010221)"
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              style={{
                flex: 1,
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 15,
                borderWidth: 1,
                borderColor: '#334155',
              }}
            />
            <TouchableOpacity
              onPress={() => lookupISBN(manualIsbn)}
              disabled={isSearching}
              style={{
                backgroundColor: '#0284c7',
                paddingHorizontal: 20,
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              {isSearching ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="search" size={18} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>Search</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Demo Barcode Presets */}
          <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8, fontWeight: '600' }}>
            Quick Demo Presets:
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {QUICK_ISBN_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.isbn}
                onPress={() => {
                  setManualIsbn(preset.isbn);
                  lookupISBN(preset.isbn);
                }}
                style={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderWidth: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                }}
              >
                <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '600' }}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Search Result Card / Fallback */}
        {searchError && (
          <View
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              borderColor: '#ef4444',
              borderWidth: 1,
              padding: 16,
              borderRadius: 16,
              marginBottom: 20,
            }}
          >
            <Text style={{ color: '#fca5a5', fontSize: 14, fontWeight: '600', marginBottom: 10 }}>
              {searchError}
            </Text>
            <TouchableOpacity
              onPress={() => setIsManualModalOpen(true)}
              style={{
                backgroundColor: '#ef4444',
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 10,
                alignSelf: 'flex-start',
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>
                Open Manual Book Entry Form
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {scannedResult && (
          <View
            style={{
              backgroundColor: '#1e293b',
              borderColor: '#0284c7',
              borderWidth: 2,
              borderRadius: 20,
              padding: 20,
              shadowColor: '#0284c7',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
              <View
                style={{
                  width: 90,
                  height: 130,
                  borderRadius: 10,
                  backgroundColor: '#0f172a',
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {scannedResult.coverUrl ? (
                  <Image
                    source={{ uri: scannedResult.coverUrl }}
                    style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                  />
                ) : (
                  <Ionicons name="book-outline" size={36} color="#64748b" />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '800', marginBottom: 4 }}>
                  SCAN MATCH FOUND
                </Text>
                <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: '800', marginBottom: 4 }}>
                  {scannedResult.title}
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 14, marginBottom: 8 }}>
                  By {scannedResult.authors.join(', ')}
                </Text>
                <Text style={{ color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>
                  ISBN: {scannedResult.isbn}
                </Text>
                {scannedResult.publisher ? (
                  <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                    Publisher: {scannedResult.publisher}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setScannedResult(null)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: '#334155',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#cbd5e1', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmAdd}
                style={{
                  flex: 2,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: '#0284c7',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }}>
                  Add to My Library
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <BookFormModal
          visible={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          initialData={fallbackBookData}
        />
      </View>
    </ScrollView>
  );
};
