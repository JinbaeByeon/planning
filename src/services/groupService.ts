import { supabase } from './supabase';

export interface TravelGroup {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  invite_code: string;
  status: 'planning' | 'confirmed';
  confirmed_date?: string;
}

export const groupService = {
  /**
   * 새로운 여행 그룹을 생성합니다.
   */
  async createGroup(name: string, userId: string): Promise<{ success: boolean; data?: TravelGroup; message: string }> {
    try {
      const inviteCode = Math.random().toString(36).substring(2, 5).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);

      // 1. 그룹 생성
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert([
          { 
            name, 
            created_by: userId,
            invite_code: inviteCode
          }
        ])
        .select()
        .single();

      if (groupError) throw groupError;

      // 2. 생성자를 멤버로 자동 추가
      await this.joinGroup(inviteCode, userId);

      return { success: true, data: groupData as TravelGroup, message: '그룹이 생성되었습니다!' };
    } catch (error: any) {
      console.error('Error creating group:', error);
      return { success: false, message: `그룹 생성 중 오류가 발생했습니다: ${error.message}` };
    }
  },

  /**
   * 초대 코드로 그룹에 참여합니다.
   */
  async joinGroup(inviteCode: string, userId: string): Promise<{ success: boolean; groupId?: string; message: string }> {
    try {
      // 1. 초대 코드로 그룹 찾기
      const { data: group, error: fetchError } = await supabase
        .from('groups')
        .select('id')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .single();

      if (fetchError || !group) {
        return { success: false, message: '유효하지 않은 초대 코드입니다.' };
      }

      // 2. 이미 멤버인지 확인
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingMember) {
        return { success: true, groupId: group.id, message: '이미 참여 중인 그룹입니다.' };
      }

      // 3. 멤버로 추가
      const { error: joinError } = await supabase
        .from('group_members')
        .insert([
          { group_id: group.id, user_id: userId }
        ]);

      if (joinError) throw joinError;

      return { success: true, groupId: group.id, message: '그룹에 참여했습니다!' };
    } catch (error: any) {
      console.error('Error joining group:', error);
      return { success: false, message: `그룹 참여 중 오류가 발생했습니다: ${error.message}` };
    }
  },

  /**
   * 사용자가 속한 여행 그룹 목록을 가져옵니다.
   */
  async getMyGroups(userId: string): Promise<TravelGroup[]> {
    try {
      // 1. group_members를 통해 내가 참여 중인 그룹 ID들 가져오기
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (memberError) throw memberError;

      const groupIds = memberData.map(m => m.group_id);

      if (groupIds.length === 0) {
        // 아직 참여 중인 그룹이 없더라도, 내가 만든 그룹(하위 호환)은 보여주기 위함
        const { data: createdGroups, error: createdError } = await supabase
          .from('groups')
          .select('*')
          .eq('created_by', userId)
          .order('created_at', { ascending: false });

        if (createdError) throw createdError;
        return createdGroups as TravelGroup[];
      }

      // 2. 해당 ID들에 해당하는 그룹 정보 가져오기
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;
      return groups as TravelGroup[];
    } catch (error) {
      console.error('Error getting groups:', error);
      return [];
    }
  },

  /**
   * 그룹 아이디로 그룹 정보를 가져옵니다.
   */
  async getGroupById(groupId: string): Promise<TravelGroup | null> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) throw error;
      return data as TravelGroup;
    } catch (error) {
      console.error('Error getting group by id:', error);
      return null;
    }
  },

  /**
   * 그룹에 속한 멤버 목록을 가져옵니다.
   */
  async getGroupMembers(groupId: string): Promise<any[]> {
    try {
      // 1. group_members 테이블에서 멤버들 가져오기
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select(`
          user_id,
          users (id, nickname)
        `)
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      // 2. 그룹 정보(방장 확인용) 가져오기
      const group = await this.getGroupById(groupId);
      if (!group) return [];

      // 3. 멤버 데이터 가공
      let memberList = members.map((item: any) => ({
        id: item.users.id,
        nickname: item.users.nickname,
        role: item.users.id === group.created_by ? '방장' : '멤버'
      }));

      // 4. [하위 호환/방어 코드] 만약 방장이 멤버 목록에 없다면 직접 추가
      const isCreatorInList = memberList.some(m => m.id === group.created_by);
      if (!isCreatorInList) {
        const { data: creator, error: creatorError } = await supabase
          .from('users')
          .select('id, nickname')
          .eq('id', group.created_by)
          .single();
        
        if (!creatorError && creator) {
          memberList.unshift({
            id: creator.id,
            nickname: creator.nickname,
            role: '방장'
          });
        }
      }

      return memberList;
    } catch (error) {
      console.error('Error getting group members:', error);
      return [];
    }
  },

  /**
   * 사용자의 가능/불가능 날짜를 업데이트합니다.
   */
  async updateAvailability(
    groupId: string, 
    userId: string, 
    availableDates: string[], 
    unavailableDates: string[]
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 1. 기존 데이터 전체 삭제
      const { error: deleteError } = await supabase
        .from('group_availability')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // 2. 새로운 데이터 준비
      const insertData = [
        ...availableDates.map(date => ({
          group_id: groupId,
          user_id: userId,
          available_date: date,
          type: 'available'
        })),
        ...unavailableDates.map(date => ({
          group_id: groupId,
          user_id: userId,
          available_date: date,
          type: 'unavailable'
        }))
      ];

      // 3. 데이터 삽입
      if (insertData.length > 0) {
        const { error: insertError } = await supabase
          .from('group_availability')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      return { success: true, message: '일정이 저장되었습니다.' };
    } catch (error: any) {
      console.error('Error updating availability:', error);
      return { success: false, message: `일정 저장 중 오류가 발생했습니다: ${error.message}` };
    }
  },

  /**
   * 그룹 전체의 일정 데이터를 가져옵니다. (타입 포함)
   */
  async getGroupAvailability(groupId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('group_availability')
        .select(`
          available_date,
          user_id,
          type,
          users (nickname)
        `)
        .eq('group_id', groupId);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting group availability:', error);
      return [];
    }
  },

  /**
   * 그룹에 새로운 장소를 추천합니다.
   */
  async addPlace(groupId: string, userId: string, name: string, description: string = ''): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('group_places')
        .insert([{ group_id: groupId, suggested_by: userId, name, description }]);

      if (error) throw error;
      return { success: true, message: '장소가 추천되었습니다!' };
    } catch (error: any) {
      console.error('Error adding place:', error);
      return { success: false, message: `장소 추가 중 오류가 발생했습니다: ${error.message}` };
    }
  },

  /**
   * 그룹의 모든 추천 장소 목록을 가져옵니다. (투표 정보 포함)
   */
  async getGroupPlaces(groupId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('group_places')
        .select(`
          *,
          users (nickname),
          place_votes (user_id)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting group places:', error);
      return [];
    }
  },

  /**
   * 추천된 장소를 삭제합니다. (등록자 또는 방장 전용)
   */
  async deletePlace(placeId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('group_places')
        .delete()
        .eq('id', placeId);

      if (error) throw error;
      return { success: true, message: '장소가 삭제되었습니다.' };
    } catch (error: any) {
      console.error('Error deleting place:', error);
      return { success: false, message: `장소 삭제 중 오류가 발생했습니다: ${error.message}` };
    }
  },

  /**
   * 장소에 투표하거나 투표를 취소합니다.
   */
  async toggleVote(placeId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // 1. 이미 투표했는지 확인
      const { data: existingVote } = await supabase
        .from('place_votes')
        .select('id')
        .eq('place_id', placeId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingVote) {
        // 투표 취소
        const { error } = await supabase
          .from('place_votes')
          .delete()
          .eq('id', existingVote.id);
        if (error) throw error;
        return { success: true, message: '투표가 취소되었습니다.' };
      } else {
        // 투표 추가
        const { error } = await supabase
          .from('place_votes')
          .insert([{ place_id: placeId, user_id: userId }]);
        if (error) throw error;
        return { success: true, message: '투표가 완료되었습니다!' };
      }
    } catch (error: any) {
      console.error('Error toggling vote:', error);
      return { success: false, message: `투표 처리 중 오류가 발생했습니다: ${error.message}` };
    }
  },

  /**
   * 장소의 확정 여부를 업데이트합니다. (방장 전용)
   */
  async updatePlaceConfirmation(placeId: string, isConfirmed: boolean): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('group_places')
        .update({ is_confirmed: isConfirmed })
        .eq('id', placeId);

      if (error) throw error;
      return { success: true, message: '장소 상태가 변경되었습니다.' };
    } catch (error: any) {
      console.error('Error updating place confirmation:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * 전체 일정을 최종 확정합니다. (방장 전용)
   */
  async finalizeGroup(groupId: string, confirmedDate: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('groups')
        .update({ 
          status: 'confirmed',
          confirmed_date: confirmedDate
        })
        .eq('id', groupId);

      if (error) throw error;
      return { success: true, message: '여행 일정이 최종 확정되었습니다!' };
    } catch (error: any) {
      console.error('Error finalizing group:', error);
      return { success: false, message: error.message };
    }
  }
};
