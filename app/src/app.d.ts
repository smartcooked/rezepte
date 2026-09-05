import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
export type Profile = { id: string; username: string; display_name: string | null; role: 'admin' | 'editor' | 'user'; active: boolean };
declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			session: Session | null;
			user: User | null;
			profile: Profile | null;
		}
		interface PageData { session: Session | null; user: User | null; profile: Profile | null }
	}
}
export {};
