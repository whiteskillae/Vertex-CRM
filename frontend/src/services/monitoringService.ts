import api from '@/lib/api';

export interface MonitoringStatus {
  _id: string;
  userName?: string;
  userEmail?: string;
  role: string;
  isSharing: boolean;
  status: string;
  lastActive?: string | Date;
}

export const getMonitoringStatus = async (): Promise<MonitoringStatus[]> => {
  const { data } = await api.get('monitoring/status');
  return data;
};

export const getSessionHistory = async (employeeId: string) => {
  const { data } = await api.get(`monitoring/history/${employeeId}`);
  return data;
};

export const saveScreenshot = async (sessionId: string, screenshot: string) => {
  const { data } = await api.post('monitoring/screenshot', { sessionId, screenshot });
  return data;
};
