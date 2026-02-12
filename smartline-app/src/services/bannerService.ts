import { apiRequest } from './backend';

export interface PromoBanner {
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  action_type: 'link' | 'screen' | 'refer';
  action_value?: string;
  target_role: 'all' | 'customer' | 'driver';
  display_order: number;
  is_active: boolean;
  starts_at?: string;
  ends_at?: string;
  created_at: string;
  updated_at: string;
}

export async function getActiveBanners(role: 'customer' | 'driver' = 'customer'): Promise<{ banners: PromoBanner[] }> {
  return apiRequest(`/banners/active?role=${role}`, { auth: false });
}
