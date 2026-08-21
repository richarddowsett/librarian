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
import { useIsFocused } from '@react-navigation/native';
import { Camera, CameraView } from 'expo-camera';
import { fetchBookByISBN, GoogleBookResult } from '../services/openLibrary';
import { useLibrary } from '../context/LibraryContext';
import { Ionicons } from '@expo/vector-icons';
import { BookFormModal } from './BookFormModal';

interface CameraScannerProps {
  onBookCataloged?: () => void;
  isFocused?: boolean;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onBookCataloged, isFocused: propIsFocused }) => {
  const hookIsFocused = useIsFocused();
  const activeFocus = propIsFocused !== undefined ? propIsFocused : hookIsFocused;
  const { addBook, books } = useLibrary();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [manualIsbn, setManualIsbn] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Scan Success Visual & Audio Feedback State
  const [scanSuccess, setScanSuccess] = useState<boolean>(false);

  // Staged Queue for Multi-Book Bulk Scanning
  const [stagedBooks, setStagedBooks] = useState<GoogleBookResult[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [fallbackBookData, setFallbackBookData] = useState<any>(null);
  const [isBulkAdding, setIsBulkAdding] = useState<boolean>(false);

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

  // Helper to normalize ISBNs
  const cleanIsbnHelper = (str?: string) => (str || '').replace(/[- ]/g, '').trim();

  // Web Camera Stream setup
  useEffect(() => {
    let stream: MediaStream | null = null;
    let scanInterval: any = null;

    if (Platform.OS === 'web' && isScanning && activeFocus) {
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
            if (videoRef.current && videoRef.current.readyState === 4 && isScanning && activeFocus) {
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
          }, 500);
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
      setWebCamActive(false);
    };
  }, [isScanning, activeFocus, Platform.OS]);

  const playBarcodeBeep = () => {
    try {
      if (typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();

          // High frequency sine beep characteristic of supermarket checkout scanners (1760 Hz)
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(1760, audioCtx.currentTime);

          gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);

          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.12);
        }
      }
    } catch (e) {
      console.warn('Scan beep audio playback failed:', e);
    }
  };

  const triggerScanSuccessVisualAndSound = () => {
    setScanSuccess(true);
    playBarcodeBeep();
    setTimeout(() => {
      setScanSuccess(false);
    }, 1200);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleBarCodeScanned = async (isbn: string) => {
    if (!isScanning || isSearching) return;
    const cleanIsbn = cleanIsbnHelper(isbn);

    // Check if book already exists in current library collection
    const existingInLibrary = books.find(
      (b) => cleanIsbnHelper(b.isbn) === cleanIsbn && cleanIsbn !== ''
    );
    if (existingInLibrary) {
      setSearchError(`Book "${existingInLibrary.title}" (ISBN: ${cleanIsbn}) already exists in your library!`);
      return;
    }

    // Prevent duplicate scans of the same ISBN in the staging queue
    if (stagedBooks.some((b) => cleanIsbnHelper(b.isbn) === cleanIsbn)) {
      showToast(`ISBN ${cleanIsbn} is already in your staging queue!`);
      return;
    }

    setIsSearching(true);
    await lookupISBN(cleanIsbn);
  };

  const lookupISBN = async (targetIsbn: string) => {
    const cleanIsbn = cleanIsbnHelper(targetIsbn);
    if (!cleanIsbn) {
      setSearchError('Please enter a valid ISBN code.');
      setIsSearching(false);
      return;
    }

    // Check if book already exists in current library collection
    const existingInLibrary = books.find(
      (b) => cleanIsbnHelper(b.isbn) === cleanIsbn && cleanIsbn !== ''
    );
    if (existingInLibrary) {
      setSearchError(`Book "${existingInLibrary.title}" (ISBN: ${cleanIsbn}) already exists in your library!`);
      setIsSearching(false);
      setIsScanning(true);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const bookData = await fetchBookByISBN(cleanIsbn);
      if (bookData) {
        // Double check title or ISBN against existing books
        const titleDuplicate = books.find(
          (b) => b.title.trim().toLowerCase() === bookData.title.trim().toLowerCase()
        );
        if (titleDuplicate) {
          setSearchError(`Book "${titleDuplicate.title}" already exists in your library!`);
          setIsSearching(false);
          setIsScanning(true);
          return;
        }

        // Automatically push book to Staged Queue
        setStagedBooks((prev) => {
          if (prev.some((b) => cleanIsbnHelper(b.isbn) === cleanIsbnHelper(bookData.isbn))) return prev;
          return [bookData, ...prev];
        });
        triggerScanSuccessVisualAndSound();
        showToast(`Added "${bookData.title}" to Queue!`);
        setManualIsbn('');
      } else {
        setSearchError(`No match found in Open Library for ISBN: ${cleanIsbn}. You can enter details manually below.`);
        setFallbackBookData({ isbn: cleanIsbn });
      }
    } catch (err: any) {
      setSearchError('Network error looking up ISBN. Please try manual entry.');
      setFallbackBookData({ isbn: cleanIsbn });
    } finally {
      setIsSearching(false);
      // Re-enable camera scanning immediately so user can scan next book continuously!
      setIsScanning(true);
    }
  };

  const handleRemoveStagedBook = (isbn: string) => {
    setStagedBooks((prev) => prev.filter((b) => b.isbn !== isbn));
  };

  const handleBulkAdd = async () => {
    if (stagedBooks.length === 0) return;
    setIsBulkAdding(true);

    let addedCount = 0;
    for (const book of stagedBooks) {
      const res = await addBook({
        title: book.title,
        authors: book.authors,
        isbn: book.isbn,
        coverUrl: book.coverUrl,
        publisher: book.publisher,
        publishDate: book.publishDate,
        pageCount: book.pageCount,
        readStatus: 'unread',
        seriesName: book.seriesName || null,
        seriesVolumeNumber: book.seriesVolumeNumber || null,
      });
      if (res.success) {
        addedCount++;
      }
    }

    setIsBulkAdding(false);
    alert(`Success! ${addedCount} book(s) have been added to your library.`);
    setStagedBooks([]);
    if (onBookCataloged) onBookCataloged();
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
        {/* Header */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: '#f8fafc', fontSize: 24, fontWeight: '800', marginBottom: 4 }}>
            Multi-Book Barcode Scanner
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 14 }}>
            Scan multiple books in a row. Scanned books will be added to your queue below, then click "Add All to Library".
          </Text>
        </View>

        {/* Scanning Toast Banner Alert */}
        {toastMessage && (
          <View
            style={{
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              borderColor: '#38bdf8',
              borderWidth: 1.5,
              padding: 12,
              borderRadius: 14,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Ionicons name="sparkles" size={20} color="#38bdf8" />
            <Text style={{ color: '#f8fafc', fontSize: 14, fontWeight: '700', flex: 1 }}>
              {toastMessage}
            </Text>
          </View>
        )}

        {/* Camera Scanner View Box */}
        <View
          style={{
            height: 300,
            backgroundColor: '#0f172a',
            borderRadius: 20,
            overflow: 'hidden',
            borderWidth: scanSuccess ? 4 : 2,
            borderColor: scanSuccess ? '#22c55e' : isScanning ? '#0284c7' : '#334155',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            marginBottom: 20,
          }}
        >
          {!activeFocus ? (
            <View style={{ flex: 1, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
              <Ionicons name="camera-outline" size={44} color="#64748b" />
              <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 8, fontWeight: '700', includeFontPadding: false }}>
                Camera Disabled
              </Text>
              <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2, includeFontPadding: false }}>
                Return to scan tab to reactivate
              </Text>
            </View>
          ) : Platform.OS !== 'web' && hasPermission ? (
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
                  backgroundColor: scanSuccess ? 'rgba(34, 197, 94, 0.15)' : 'rgba(0,0,0,0.3)',
                }}
              >
                <View
                  style={{
                    width: 260,
                    height: 150,
                    borderWidth: scanSuccess ? 3 : 2,
                    borderColor: scanSuccess ? '#22c55e' : '#38bdf8',
                    borderRadius: 16,
                    backgroundColor: scanSuccess ? 'rgba(34, 197, 94, 0.25)' : 'rgba(56, 189, 248, 0.08)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {scanSuccess ? (
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                      <Text style={{ color: '#22c55e', fontSize: 15, fontWeight: '800' }}>
                        Scanned Successfully!
                      </Text>
                    </View>
                  ) : (
                    <View style={{ width: '80%', height: 2, backgroundColor: '#ef4444' }} />
                  )}
                </View>
                <Text style={{ color: scanSuccess ? '#22c55e' : '#ffffff', fontSize: 13, marginTop: 10, fontWeight: '700' }}>
                  {scanSuccess ? '✓ Barcode Recognized!' : 'Position barcode inside the target box'}
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
                    backgroundColor: scanSuccess ? 'rgba(34, 197, 94, 0.15)' : 'rgba(0,0,0,0.2)',
                  }}
                >
                  <View
                    style={{
                      width: 260,
                      height: 150,
                      borderWidth: scanSuccess ? 3 : 2,
                      borderColor: scanSuccess ? '#22c55e' : '#38bdf8',
                      borderRadius: 16,
                      backgroundColor: scanSuccess ? 'rgba(34, 197, 94, 0.25)' : 'rgba(56, 189, 248, 0.08)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {scanSuccess ? (
                      <View style={{ alignItems: 'center', gap: 4 }}>
                        <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                        <Text style={{ color: '#22c55e', fontSize: 15, fontWeight: '800' }}>
                          Scanned Successfully!
                        </Text>
                      </View>
                    ) : (
                      <View style={{ width: '80%', height: 2, backgroundColor: '#ef4444' }} />
                    )}
                  </View>
                  <Text style={{ color: scanSuccess ? '#22c55e' : '#ffffff', fontSize: 13, marginTop: 10, fontWeight: '700' }}>
                    {scanSuccess ? '✓ Barcode Recognized!' : 'Hold book barcode up to webcam'}
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

        {/* Manual ISBN Numeric Search Form */}
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
                paddingVertical: 12,
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
                  <Text style={{ color: '#ffffff', fontWeight: '700', includeFontPadding: false }}>Search</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Demo Presets */}
          <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8, fontWeight: '600', includeFontPadding: false }}>
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
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '600', includeFontPadding: false }}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Search Error Banner */}
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
            <Text style={{ color: '#fca5a5', fontSize: 14, fontWeight: '600', marginBottom: 10, includeFontPadding: false }}>
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
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13, includeFontPadding: false }}>
                Open Manual Book Entry Form
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STAGED BOOKS QUEUE & BULK SAVE */}
        {stagedBooks.length > 0 && (
          <View
            style={{
              backgroundColor: '#1e293b',
              borderColor: '#0284c7',
              borderWidth: 2,
              borderRadius: 20,
              padding: 20,
              marginBottom: 24,
              shadowColor: '#0284c7',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 12,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="library" size={22} color="#38bdf8" />
                <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: '800', includeFontPadding: false }}>
                  Staged Books Queue ({stagedBooks.length})
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setStagedBooks([])}
                style={{ paddingVertical: 4, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600', includeFontPadding: false }}>Clear Queue</Text>
              </TouchableOpacity>
            </View>

            {/* List of Staged Books */}
            <View style={{ gap: 12, marginBottom: 20 }}>
              {stagedBooks.map((book) => (
                <View
                  key={book.isbn}
                  style={{
                    flexDirection: 'row',
                    backgroundColor: '#0f172a',
                    borderRadius: 14,
                    padding: 12,
                    alignItems: 'center',
                    gap: 12,
                    borderWidth: 1,
                    borderColor: '#334155',
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 68,
                      borderRadius: 8,
                      backgroundColor: '#1e293b',
                      overflow: 'hidden',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {book.coverUrl ? (
                      <Image source={{ uri: book.coverUrl }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                    ) : (
                      <Ionicons name="book" size={24} color="#64748b" />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#f8fafc', fontSize: 15, fontWeight: '800', includeFontPadding: false }} numberOfLines={1}>
                      {book.title}
                    </Text>
                    <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 2, includeFontPadding: false }} numberOfLines={1}>
                      By {book.authors.join(', ')}
                    </Text>
                    <Text style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace', marginTop: 4, includeFontPadding: false }}>
                      ISBN: {book.isbn}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleRemoveStagedBook(book.isbn)}
                    style={{ padding: 8, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.15)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#fca5a5" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Bulk Add Action Button */}
            <TouchableOpacity
              onPress={handleBulkAdd}
              disabled={isBulkAdding}
              style={{
                backgroundColor: '#0284c7',
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              {isBulkAdding ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={20} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 16, includeFontPadding: false }}>
                    Add All ({stagedBooks.length}) Books to My Library
                  </Text>
                </>
              )}
            </TouchableOpacity>
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
