import api from '../../../services/api';

export const fetchSandboxTrip = async (tripId: string) => {
  console.log('Fetching sandbox trip for:', tripId);
  const response = await api.get(`/trips/${tripId}/`);
  return response.data;
};
