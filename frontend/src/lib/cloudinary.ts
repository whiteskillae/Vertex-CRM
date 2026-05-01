import api from "./api";

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'pdf', 'docx', 'doc', 'xlsx', 'xls',
  'csv', 'txt', 'ppt', 'pptx',
  'mp4', 'mp3', 'wav'
];

export const uploadToCloudinary = async (file: File): Promise<string> => {
  // ── Client-side validation before uploading ──────────────────────────────────
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`File type ".${ext}" is not allowed. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}`);
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const { data } = await api.post("upload", formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // 60s timeout for large files
    });
    return data.secure_url;
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message || 'Upload failed';
    throw new Error(msg);
  }
};
