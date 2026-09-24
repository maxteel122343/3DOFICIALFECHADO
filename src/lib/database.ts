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

  // 2. Local fallback persistence (guarantee offline and local session persistence)
  try {
    if (payload.objectType === 'avatar') {
      const savedAvatarsRaw = localStorage.getItem(STORE_AVATARS_LOCAL_KEY);
      const avatars: StoreAvatar[] = savedAvatarsRaw ? JSON.parse(savedAvatarsRaw) : [];
      const newAvatar: StoreAvatar = {
        id: generatedId,
        name: payload.name,
        price: payload.price,
        rarity: payload.rarity || 'RARO',
        tags: payload.hashtags || ['#avatar', '#3d'],
        thumb: payload.thumbnailUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        author: user?.displayName || payload.author || 'Luzenne',
        isUserPublished: true,
        owned: true,
        applied: false,
        description: payload.description,
        fileBlobUrl: payload.fileBlobUrl,
      };
      const updated = [newAvatar, ...avatars.filter((a) => a.id !== generatedId)];
      localStorage.setItem(STORE_AVATARS_LOCAL_KEY, JSON.stringify(updated));
    } else {
      const savedItemsRaw = localStorage.getItem(STORE_ITEMS_LOCAL_KEY);
      const items: CustomizationItem[] = savedItemsRaw ? JSON.parse(savedItemsRaw) : [];
      const newItem: CustomizationItem = {
        id: generatedId,
        code: `#P${Math.floor(100 + Math.random() * 900)}`,
        name: payload.name,
        category: payload.objectType === 'moveis' ? 'outros' : 'publicados',
        thumb: payload.thumbnailUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80',
        owned: true,
        equipped: false,
        price: payload.price,
        rarity: payload.rarity || 'RARO',
        isPublishedByCreator: true,
        author: user?.displayName || payload.author || 'Luzenne',
        fileBlobUrl: payload.fileBlobUrl,
        description: payload.description || `Item 3D criado por ${user?.displayName || 'Luzenne'}.`,
      };
      const updated = [newItem, ...items.filter((i) => i.id !== generatedId)];
      localStorage.setItem(STORE_ITEMS_LOCAL_KEY, JSON.stringify(updated));
    }
  } catch (storageErr) {
    console.warn('LocalStorage save error:', storageErr);
  }

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
  const roomId = room.id || `room-${Date.now()}`;

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

  // Local fallback persistence
  try {
    const savedRoomsRaw = localStorage.getItem(SHOWCASE_ROOMS_LOCAL_KEY);
    const roomsList = savedRoomsRaw ? JSON.parse(savedRoomsRaw) : [];
    const showcaseRoomEntry = {
      id: roomId,
      name: room.name,
      description: `Sala criada por ${user?.displayName || 'Luzenne'}`,
      occupancy: '1/8',
      currentUsers: 1,
      maxUsers: 8,
      theme: options?.hashtags?.[0] || '#vitrine3d',
      thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      badge: 'CRIADOR',
      editorRoom: { ...room, isPublished: true },
      price: options?.price || 0,
      publishMode: options?.publishMode || 'simples',
    };
    const updated = [showcaseRoomEntry, ...roomsList.filter((r: any) => r.id !== roomId)];
    localStorage.setItem(SHOWCASE_ROOMS_LOCAL_KEY, JSON.stringify(updated));

    // Also update editor rooms
    const editorRoomsRaw = localStorage.getItem('3d_social_creator_rooms');
    if (editorRoomsRaw) {
      const editorRooms: RoomEditorState[] = JSON.parse(editorRoomsRaw);
      const updatedEditorRooms = editorRooms.map((r) =>
        r.id === room.id ? { ...r, name: room.name, isPublished: true, publishedAt: new Date().toISOString() } : r
      );
      localStorage.setItem('3d_social_creator_rooms', JSON.stringify(updatedEditorRooms));
    }
  } catch (err) {
    console.warn('Failed to update showcase rooms in localStorage:', err);
  }

  return { success: true, id: roomId };
}
