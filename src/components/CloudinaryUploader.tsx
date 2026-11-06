import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import {
  UploadCloud,
  File,
  FileText,
  Image as ImageIcon,
  Film,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export interface CloudinaryUploadResponse {
  asset_id?: string;
  public_id: string;
  version: number;
  version_id?: string;
  signature?: string;
  width?: number;
  height?: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags?: string[];
  bytes: number;
  type: string;
  etag?: string;
  placeholder?: boolean;
  url: string;
  secure_url: string;
  folder?: string;
  original_filename?: string;
}

export interface CloudinaryUploaderProps {
  uploadPreset: string;
  onUploadSuccess: (response: CloudinaryUploadResponse, file: File) => void;
  onUploadError?: (error: Error) => void;
  maxFileSize?: number; // In bytes (default 50MB)
  allowedFormats?: string[]; // e.g. ['jpg', 'png', 'pdf']
  folder?: string;
  cloudName?: string;
  description?: string;
  compact?: boolean;
  disabled?: boolean;
  autoUpload?: boolean;
  title?: string;
  subtitle?: string;
  acceptTypes?: Accept;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getFormatIcon(filename: string, fileType: string) {
  const lowerName = filename.toLowerCase();
  const lowerType = fileType.toLowerCase();

  if (lowerType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(lowerName)) {
    return <ImageIcon size={22} color="var(--primary)" />;
  }
  if (lowerType.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv)$/.test(lowerName)) {
    return <Film size={22} color="#8b5cf6" />;
  }
  if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) {
    return <FileText size={22} color="#ef4444" />;
  }
  return <File size={22} color="var(--slate-500)" />;
}

export const CloudinaryUploader: React.FC<CloudinaryUploaderProps> = ({
  uploadPreset,
  onUploadSuccess,
  onUploadError,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  allowedFormats,
  folder,
  cloudName: propCloudName,
  compact = false,
  disabled = false,
  autoUpload = true,
  title,
  subtitle,
  acceptTypes,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const activeXhrRef = useRef<XMLHttpRequest | null>(null);

  const effectiveCloudName =
    propCloudName ||
    (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME ||
    '';

  // Revoke object URL on unmount or file change to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxFileSize) {
        return `File exceeds maximum allowed size of ${formatBytes(maxFileSize)} (selected: ${formatBytes(file.size)})`;
      }

      if (allowedFormats && allowedFormats.length > 0) {
        const fileExt = file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase();
        const isAllowed = allowedFormats.some((fmt) => fmt.toLowerCase().replace('.', '') === fileExt);
        if (!isAllowed) {
          return `Invalid file format .${fileExt}. Allowed formats: ${allowedFormats.join(', ')}`;
        }
      }

      return null;
    },
    [maxFileSize, allowedFormats]
  );

  const cancelUpload = useCallback(() => {
    if (activeXhrRef.current) {
      activeXhrRef.current.abort();
      activeXhrRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(0);
    setErrorMessage('Upload cancelled');
  }, []);

  const resetState = useCallback(() => {
    if (activeXhrRef.current) {
      activeXhrRef.current.abort();
      activeXhrRef.current = null;
    }
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setIsUploading(false);
    setErrorMessage(null);
    setIsSuccess(false);
  }, [previewUrl]);

  const executeUpload = useCallback(
    async (fileToUpload: File) => {
      const validationError = validateFile(fileToUpload);
      if (validationError) {
        setErrorMessage(validationError);
        onUploadError?.(new Error(validationError));
        return;
      }

      // Check if Cloudinary cloud name is configured
      if (!effectiveCloudName || effectiveCloudName === 'your_cloud_name_here') {
        const err = new Error(
          'Cloudinary is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME in .env.local'
        );
        setErrorMessage(err.message);
        onUploadError?.(err);
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);
      setErrorMessage(null);
      setIsSuccess(false);

      const endpoint = `https://api.cloudinary.com/v1_1/${effectiveCloudName}/auto/upload`;

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('upload_preset', uploadPreset);
      if (folder) {
        formData.append('folder', folder);
      }

      const xhr = new XMLHttpRequest();
      activeXhrRef.current = xhr;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        activeXhrRef.current = null;
        setIsUploading(false);

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const responseData: CloudinaryUploadResponse = JSON.parse(xhr.responseText);
            setIsSuccess(true);
            setUploadProgress(100);
            onUploadSuccess(responseData, fileToUpload);
          } catch (e: any) {
            const err = new Error('Failed to parse Cloudinary response: ' + e.message);
            setErrorMessage(err.message);
            onUploadError?.(err);
          }
        } else {
          let errorMsg = `Upload failed with status ${xhr.status}`;
          try {
            const errorObj = JSON.parse(xhr.responseText);
            if (errorObj.error?.message) {
              errorMsg = errorObj.error.message;
            }
          } catch {
            // Keep default error status
          }
          const err = new Error(errorMsg);
          setErrorMessage(errorMsg);
          onUploadError?.(err);
        }
      };

      xhr.onerror = () => {
        activeXhrRef.current = null;
        setIsUploading(false);
        const err = new Error('Network error during upload to Cloudinary');
        setErrorMessage(err.message);
        onUploadError?.(err);
      };

      xhr.onabort = () => {
        activeXhrRef.current = null;
        setIsUploading(false);
      };

      xhr.open('POST', endpoint, true);
      xhr.send(formData);
    },
    [
      effectiveCloudName,
      uploadPreset,
      folder,
      validateFile,
      onUploadSuccess,
      onUploadError,
    ]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (disabled || isUploading || acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setSelectedFile(file);
      setErrorMessage(null);
      setIsSuccess(false);

      if (file.type.startsWith('image/')) {
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
      } else {
        setPreviewUrl(null);
      }

      if (autoUpload) {
        executeUpload(file);
      }
    },
    [disabled, isUploading, autoUpload, executeUpload]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    disabled: disabled || isUploading,
    multiple: false,
    accept: acceptTypes,
    noClick: Boolean(selectedFile && !isSuccess), // Allow button click when file is previewed
  });

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: 'inherit',
      }}
    >
      {/* Drag & Drop Surface */}
      <div
        {...getRootProps()}
        role="button"
        tabIndex={0}
        aria-label="Upload file to Cloudinary"
        style={{
          border: isDragActive
            ? '2px dashed var(--primary)'
            : errorMessage
            ? '2px dashed var(--danger)'
            : '2px dashed var(--border-primary, #cbd5e1)',
          borderRadius: 'var(--radius-md, 8px)',
          padding: compact ? '14px 16px' : '24px 20px',
          textAlign: 'center',
          cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
          backgroundColor: isDragActive
            ? 'rgba(37, 99, 235, 0.06)'
            : isSuccess
            ? 'rgba(16, 185, 129, 0.04)'
            : 'var(--bg-secondary, #f8fafc)',
          transition: 'all 0.15s ease',
          outline: 'none',
          position: 'relative',
        }}
      >
        <input {...getInputProps()} aria-label="Choose file to upload" />

        {/* Selected File / Preview State */}
        {selectedFile ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              textAlign: 'left',
              width: '100%',
            }}
          >
            {/* Left Thumbnail or File Icon */}
            <div
              style={{
                width: compact ? '48px' : '64px',
                height: compact ? '48px' : '64px',
                borderRadius: 'var(--radius-sm, 6px)',
                backgroundColor: 'var(--bg-primary, #ffffff)',
                border: '1px solid var(--border-primary, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                getFormatIcon(selectedFile.name, selectedFile.type)
              )}
            </div>

            {/* Middle Info + Progress */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary, #0f172a)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={selectedFile.name}
              >
                {selectedFile.name}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-tertiary, #64748b)',
                  marginTop: '2px',
                }}
              >
                {formatBytes(selectedFile.size)} � {selectedFile.type || 'file'}
              </div>

              {/* Progress bar */}
              {isUploading && (
                <div style={{ marginTop: '8px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: 'var(--text-secondary, #475569)',
                      marginBottom: '4px',
                    }}
                  >
                    <span>Uploading...</span>
                    <span style={{ fontWeight: 600 }}>{uploadProgress}%</span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '5px',
                      backgroundColor: 'var(--border-primary, #e2e8f0)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${uploadProgress}%`,
                        height: '100%',
                        backgroundColor: 'var(--primary, #2563eb)',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                </div>
              )}

              {isSuccess && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#059669',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginTop: '6px',
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span>Upload complete</span>
                </div>
              )}
            </div>

            {/* Right Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {isUploading ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelUpload();
                  }}
                  title="Cancel upload"
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    border: '1px solid var(--border-primary, #cbd5e1)',
                    backgroundColor: 'var(--bg-primary, #ffffff)',
                    color: 'var(--text-secondary, #475569)',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <X size={13} />
                  <span>Cancel</span>
                </button>
              ) : isSuccess ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetState();
                    open();
                  }}
                  title="Upload another file"
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    border: '1px solid var(--border-primary, #cbd5e1)',
                    backgroundColor: 'var(--bg-primary, #ffffff)',
                    color: 'var(--text-secondary, #475569)',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RefreshCw size={12} />
                  <span>Change</span>
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {!autoUpload && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        executeUpload(selectedFile);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm, 6px)',
                        border: 'none',
                        backgroundColor: 'var(--primary, #2563eb)',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Upload
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetState();
                    }}
                    title="Remove file"
                    style={{
                      padding: '6px',
                      borderRadius: 'var(--radius-sm, 6px)',
                      border: '1px solid var(--border-primary, #cbd5e1)',
                      backgroundColor: 'transparent',
                      color: 'var(--slate-500, #64748b)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty / Default Dropzone State */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: compact ? '6px' : '10px',
            }}
          >
            <div
              style={{
                width: compact ? '36px' : '44px',
                height: compact ? '36px' : '44px',
                borderRadius: '50%',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary, #2563eb)',
              }}
            >
              {isUploading ? (
                <Loader2 size={compact ? 18 : 22} className="animate-spin" />
              ) : (
                <UploadCloud size={compact ? 20 : 24} />
              )}
            </div>

            <div>
              <div
                style={{
                  fontSize: compact ? '12px' : '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary, #0f172a)',
                }}
              >
                {title || (isDragActive ? 'Drop file to upload' : 'Click to browse or drop file here')}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-tertiary, #64748b)',
                  marginTop: '2px',
                }}
              >
                {subtitle ||
                  (allowedFormats && allowedFormats.length > 0
                    ? `${allowedFormats.join(', ').toUpperCase()} up to ${formatBytes(maxFileSize)}`
                    : `Any file format up to ${formatBytes(maxFileSize)}`)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm, 6px)',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#dc2626',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, wordBreak: 'break-word' }}>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc2626',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
};

export default CloudinaryUploader;
