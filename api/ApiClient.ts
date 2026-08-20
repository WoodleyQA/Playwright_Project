import { APIRequestContext, APIResponse } from '@playwright/test';
import { AuthResponse, Booking } from './types';

export class ApiClient {
  constructor(private readonly request: APIRequestContext) {}

  ping(): Promise<APIResponse> {
    return this.request.get('/ping');
  }

  authenticate(username: string, password: string): Promise<APIResponse> {
    return this.request.post('/auth', { data: { username, password } });
  }

  async createToken(username: string, password: string): Promise<string> {
    const response = await this.authenticate(username, password);
    const body: AuthResponse = await response.json();
    if (!body.token) {
      throw new Error(`Failed to authenticate: ${body.reason ?? response.statusText()}`);
    }
    return body.token;
  }

  getBookingIds(filters?: Record<string, string | number>): Promise<APIResponse> {
    return this.request.get('/booking', { params: filters });
  }

  getBooking(id: number): Promise<APIResponse> {
    return this.request.get(`/booking/${id}`);
  }

  createBooking(booking: Booking): Promise<APIResponse> {
    return this.request.post('/booking', { data: booking });
  }

  updateBooking(id: number, booking: Booking, token: string): Promise<APIResponse> {
    return this.request.put(`/booking/${id}`, {
      data: booking,
      headers: { Cookie: `token=${token}` },
    });
  }

  partialUpdateBooking(id: number, booking: Partial<Booking>, token: string): Promise<APIResponse> {
    return this.request.patch(`/booking/${id}`, {
      data: booking,
      headers: { Cookie: `token=${token}` },
    });
  }

  deleteBooking(id: number, token: string): Promise<APIResponse> {
    return this.request.delete(`/booking/${id}`, {
      headers: { Cookie: `token=${token}` },
    });
  }
}
