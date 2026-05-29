import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  nickname: string;
}

export const userService = {
  /**
   * 새로운 사용자를 생성합니다. (Supabase DB 사용)
   */
  async createUser(id: string, nickname: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Attempting to create user in Supabase:', id);
      
      const { error } = await supabase
        .from('users')
        .insert([{ id, nickname }]);

      if (error) {
        if (error.code === '23505') {
          return { success: false, message: '이미 존재하는 아이디입니다.' };
        }
        throw error;
      }

      console.log('User created successfully in Supabase:', id);
      return { success: true, message: '회원가입 성공!' };
    } catch (error: any) {
      console.error('Detailed error in Supabase createUser:', error);
      return { success: false, message: `회원가입 중 오류가 발생했습니다: ${error.message}` };
    }
  },

  /**
   * 아이디로 사용자 정보를 조회합니다.
   */
  async getUser(id: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // 결과 없음
        throw error;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error getting user from Supabase:', error);
      return null;
    }
  }
};
