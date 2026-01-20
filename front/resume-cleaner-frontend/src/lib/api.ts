import axios, { AxiosError } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export type Resume = {
  id: number;
  original_filename: string;
  status: string;
  uploaded_at: string;
  cleaned_text: string | null;
  cleaned_pdf: string | null;
};

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
  headers: {
    Accept: "application/json",
  },
});

//get all resumes
export const getResumes = async (): Promise<Resume[]> => {
  try {
    const res = await api.get("/resumes");
    return res.data as Resume[];
  } catch (err) {
    handleAxiosError(err);
  }
};

//upload resume
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

//clean resume
export const cleanResume = async (id: number): Promise<Resume> => {
  try {
    const res = await api.post(`/resumes/${id}/clean`);
    return res.data as Resume;
  } catch (err) {
    handleAxiosError(err);
  }
};

//delete resume
export const deleteResume = async (id: number): Promise<{ message: string }> => {
  try {
    const res = await api.delete(`/resumes/${id}`);
    return res.data as { message: string };
  } catch (err) {
    handleAxiosError(err);
  }
};

//export pdf
export const exportResume = (id: number) => {
  const url = `${BASE_URL}/resumes/${id}/export`;
  window.open(url, "_blank");
};

//Axios handler
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
