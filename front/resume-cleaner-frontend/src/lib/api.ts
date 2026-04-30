import axios, { AxiosError } from "axios";

// Use the deployed backend URL when provided, otherwise fall back to local dev.
export const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(/\/+$/, "");

// Shape of a resume record returned by the backend API.
export type Resume = {
  id: number;
  original_filename: string;
  status: string;
  uploaded_at: string;
  cleaned_text: string | null;
  cleaned_pdf: string | null;
};

// Shared Axios client so every request uses the same base URL and headers.
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

// Fetch all stored resumes for the current frontend session
export const getResumes = async (): Promise<Resume[]> => {
  try {
    const res = await api.get("/resumes");
    return res.data as Resume[];
  } catch (err) {
    handleAxiosError(err);
  }
};

// Upload a resume file using multipart form data
export const uploadResume = async (
  fd: FormData,
  onProgress?: (progress: number) => void
): Promise<Resume> => {
  try {
    const res = await api.post("/resumes", fd, {
      timeout: 120000,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (event) => {
        if (!event.total || !onProgress) return;
        onProgress(Math.round((event.loaded * 100) / event.total));
      },
    });
    return res.data as Resume;
  } catch (err) {
    handleAxiosError(err);
  }
};

// Ask the backend to parse, rewrite, and save the cleaned version of a resume.
export const cleanResume = async (id: number): Promise<Resume> => {
  try {
    const res = await api.post(`/resumes/${id}/clean`);
    return res.data as Resume;
  } catch (err) {
    handleAxiosError(err);
  }
};

// delete a resume record and its related files from the backend
export const deleteResume = async (id: number): Promise<{ message: string }> => {
  try {
    const res = await api.delete(`/resumes/${id}`);
    return res.data as { message: string };
  } catch (err) {
    handleAxiosError(err);
  }
};

// Open the cleaned PDF export route in a new tab for download/viewing.
export const exportResume = (id: number) => {
  const url = `${BASE_URL}/resumes/${id}/export`;
  window.open(url, "_blank");
};

function buildRequestLabel(axiosErr: AxiosError) {
  const method = axiosErr.config?.method?.toUpperCase() ?? "REQUEST";
  const url = axiosErr.config?.url ?? "unknown-endpoint";
  return `${method} ${url}`;
}

function extractBackendMessage(data: unknown) {
  if (typeof data === "string" && data.trim()) return data.trim();

  if (data && typeof data === "object") {
    const maybeMessage = (data as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage.trim();
    }
  }

  return null;
}

// Convert Axios failures into detailed errors that are easier to debug in the UI.
function handleAxiosError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError;
    const requestLabel = buildRequestLabel(axiosErr);
    const backendMessage = extractBackendMessage(axiosErr.response?.data);

    if (axiosErr.response) {
      const status = axiosErr.response.status;
      const statusText = axiosErr.response.statusText || "Request failed";
      const details = backendMessage ?? axiosErr.message;
      throw new Error(`${requestLabel} failed with ${status} ${statusText}: ${details}`);
    }

    if (axiosErr.code === "ECONNABORTED") {
      throw new Error(`${requestLabel} timed out after 30 seconds.`);
    }

    if (axiosErr.request) {
      throw new Error(
        `${requestLabel} did not receive a response. This usually means the backend is down, the API URL is wrong, or the request was blocked by CORS/network rules.`
      );
    }

    throw new Error(`${requestLabel} could not be created: ${axiosErr.message}`);
  }

  throw new Error("Unknown error occurred");
}
