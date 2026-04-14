import axios, { AxiosError } from "axios";

// Use the deployed backend URL when provided, otherwise fall back to local dev.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

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
export const uploadResume = async (fd: FormData): Promise<Resume> => {
  try {
    const res = await api.post("/resumes", fd, {
      headers: {
        "Content-Type": "multipart/form-data",
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

// Convert Axios-specific failures into a plain Error with the backend message.
function handleAxiosError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<{ message?: string }>;
    const msg =
      axiosErr.response?.data?.message ||
      axiosErr.message ||
      "Unknown server error";
    throw new Error(msg);
  }

  throw new Error("Unknown error occurred");
}
