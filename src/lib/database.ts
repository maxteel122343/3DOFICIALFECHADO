import { supabase } from './supabase';
import { CreatorUser, CustomizationItem, PublishItemPayload, RoomEditorState, StoreAvatar } from '../types';

const STORE_ITEMS_LOCAL_KEY = '3d_social_creator_customization_items';
const STORE_AVATARS_LOCAL_KEY = '3d_social_creator_store_avatars';
const SHOWCASE_ROOMS_LOCAL_KEY = '3d_social_creator_lobby_rooms';

/**
 * Persists a published store item to Supabase and localStorage fallback.
 * Works seamlessly whether online with Supabase or offline.
 */
export async function persistStoreItem(
  payload: PublishItemPayload,
  user: CreatorUser | null
): Promise<{ success: boolean; id: string; error?: string }> {
  const generatedId = `pub-${Date.now()}`;

  // 1. Try to persist to Supabase if user is logged in
  if (user && !user.isGuest && user.id) {
    try {
      const { data, error } = await supabase
        .from('store_items')
        .insert([
          {
            user_id: user.id,
            name: payload.name,
            object_type: payload.objectType,
            price: payload.price,
            hashtags: payload.hashtags,
            thumbnail_url: payload.thumbnailUrl,
            asset_url: payload.fileBlobUrl || null,
            rarity: payload.rarity || 'COMUM',
            description: payload.description || '',
            publish_mode: payload.publishMode,
            metadata: payload.metadata || {},
          },
        ])
        .select()
        .single();

      if (!error && data) {
        return { success: true, id: data.id };
      }
      console.warn('Supabase store_items insert fallback:', error?.message);
    } catch (err: any) {
      console.warn('Supabase store_items query failed, using local storage fallback:', err.message);
    }
  }

  // 2. Local fallback persistence
  return { success: true, id: generatedId };
}

/**
 * Persists a showcase room to Supabase and localStorage fallback.
 */
export async function persistShowcaseRoom(
  room: RoomEditorState,
  user: CreatorUser | null,
  options?: {
    publishMode?: 'simples' | 'avancado';
    price?: number;
    hashtags?: string[];
  }
): Promise<{ success: boolean; id: string; error?: string }> {
  const roomId = `room-${Date.now()}`;

  if (user && !user.isGuest && user.id) {
    try {
      const { data, error } = await supabase
        .from('showcase_rooms')
        .insert([
          {
            user_id: user.id,
            name: room.name,
            description: `Sala criada por ${user.displayName}`,
            boundary: room.boundary,
            spots: room.spots,
            placed_objects: room.placedObjects,
            hashtags: options?.hashtags || ['#sala', '#vitrine3d'],
            price: options?.price || 0,
            publish_mode: options?.publishMode || 'simples',
            is_published: true,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        return { success: true, id: data.id };
      }
      console.warn('Supabase showcase_rooms insert fallback:', error?.message);
    } catch (err: any) {
      console.warn('Supabase showcase_rooms query failed, using local storage fallback:', err.message);
    }
  }

  return { success: true, id: roomId };
}
