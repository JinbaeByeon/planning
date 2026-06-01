import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  ChevronLeft, 
  Calendar as CalendarIcon, 
  MapPin, 
  Users, 
  Share2, 
  Loader2, 
  Save, 
  Check, 
  PlusCircle, 
  Crown, 
  Flag,
  CircleCheck,
  ChevronRight,
  XCircle,
  Trash2,
  GripVertical
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { groupService } from '@/services/groupService';
import type { TravelGroup, ItineraryItem } from '@/services/groupService';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
const adjustTimeString = (timeStr: string, offsetMinutes: number): string => {
  if (!timeStr) return '09:00';
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m;
  const newTotal = (total + offsetMinutes + 24 * 60) % (24 * 60); // 24시간 순환
  const newH = String(Math.floor(newTotal / 60)).padStart(2, '0');
  const newM = String(newTotal % 60).padStart(2, '0');
  return `${newH}:${newM}`;
};

const parseConfirmedDate = (dateStr?: string): Date[] => {
  if (!dateStr) return [new Date()];
  
  // 1. 범위 날짜 포맷 (예: "2026-06-01 ~ 2026-06-03")
  if (dateStr.includes('~')) {
    const [startPart, endPart] = dateStr.split('~').map(s => s.trim());
    try {
      const start = parseISO(startPart);
      const end = parseISO(endPart);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const daysCount = differenceInDays(end, start) + 1;
        const dates: Date[] = [];
        for (let i = 0; i < daysCount; i++) {
          dates.push(addDays(start, i));
        }
        return dates;
      }
    } catch (e) {
      console.error("Error parsing range date:", e);
    }
  }

  // 2. 한국어 완성형 레거시 포맷 (예: "2026년 06월 01일 (월요일)")
  const koreanRegex = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/;
  const match = dateStr.match(koreanRegex);
  if (match) {
    const [_, y, m, d] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime())) {
      return [date];
    }
  }

  // 3. 단일 날짜 포맷 (예: "2026-06-01")
  try {
    const singleDate = parseISO(dateStr);
    if (!isNaN(singleDate.getTime())) {
      return [singleDate];
    }
  } catch (e) {
    console.error("Error parsing single date:", e);
  }

  return [new Date()];
};

const GroupPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const userId = localStorage.getItem('travel_user_id');

  const [group, setGroup] = useState<TravelGroup | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 캘린더 관련 상태
  const [selectedAvailable, setSelectedAvailable] = useState<Date[]>([]);
  const [selectedUnavailable, setSelectedUnavailable] = useState<Date[]>([]);
  const [selectionMode, setSelectionMode] = useState<'available' | 'unavailable'>('available');
  const [allAvailability, setAllAvailability] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 장소 관련 상태
  const [places, setPlaces] = useState<any[]>([]);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceDesc, setNewPlaceDesc] = useState('');
  const [isAddingPlace, setIsAddingPlace] = useState(false);

  // 일정표(Itinerary) 상태
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [activeDay, setActiveDay] = useState<number>(1);
  const [isAddingItin, setIsAddingItin] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string>('');
  const [editingField, setEditingField] = useState<'time' | 'place' | 'memo' | null>(null);
  const [editItinTime, setEditItinTime] = useState('');
  const [editItinCustomPlace, setEditItinCustomPlace] = useState('');
  const [editItinMemo, setEditItinMemo] = useState('');

  // 확정 관련 상태
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);

  // 삭제 관련 상태
  const [placeToDelete, setPlaceToDelete] = useState<{id: string, name: string} | null>(null);

  // 최종 확정 컨펌 상태
  const [dateToFinalize, setDateToFinalize] = useState<string | null>(null);

  const confirmedDates = parseConfirmedDate(group?.confirmed_date);

  useEffect(() => {
    if (groupId) {
      fetchGroupData();
    }
  }, [groupId]);

  const fetchGroupData = async () => {
    if (!groupId || !userId) return;
    setLoading(true);
    
    const [groupData, memberData, availabilityData, placeData, itineraryData] = await Promise.all([
      groupService.getGroupById(groupId),
      groupService.getGroupMembers(groupId),
      groupService.getGroupAvailability(groupId),
      groupService.getGroupPlaces(groupId),
      groupService.getItinerary(groupId)
    ]);

    setGroup(groupData);
    setMembers(memberData);
    setAllAvailability(availabilityData);
    setPlaces(placeData);
    setItinerary(itineraryData);
    setIsCreator(groupData?.created_by === userId);

    // 내 선택 날짜 초기화 (타입별 분리)
    const myAvailable = availabilityData
      .filter((a: any) => a.user_id === userId && a.type === 'available')
      .map((a: any) => parseISO(a.available_date));
    const myUnavailable = availabilityData
      .filter((a: any) => a.user_id === userId && a.type === 'unavailable')
      .map((a: any) => parseISO(a.available_date));
    
    setSelectedAvailable(myAvailable);
    setSelectedUnavailable(myUnavailable);
    
    setLoading(false);
  };

  const handleSaveAvailability = async () => {
    if (!groupId || !userId) return;
    
    setIsSaving(true);
    const availableStrs = selectedAvailable.map(d => format(d, 'yyyy-MM-dd'));
    const unavailableStrs = selectedUnavailable.map(d => format(d, 'yyyy-MM-dd'));
    
    const result = await groupService.updateAvailability(groupId, userId, availableStrs, unavailableStrs);
    setIsSaving(false);

    if (result.success) {
      alert('내 가능 일정이 저장되었습니다!');
      const availabilityData = await groupService.getGroupAvailability(groupId);
      setAllAvailability(availabilityData);
    } else {
      alert(result.message);
    }
  };

  const handleAddPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !userId || !newPlaceName.trim()) return;

    setIsAddingPlace(true);
    const result = await groupService.addPlace(groupId, userId, newPlaceName, newPlaceDesc);
    setIsAddingPlace(false);

    if (result.success) {
      setNewPlaceName('');
      setNewPlaceDesc('');
      const placeData = await groupService.getGroupPlaces(groupId);
      setPlaces(placeData);
    } else {
      alert(result.message);
    }
  };

  const handleVote = async (placeId: string) => {
    if (!userId || group?.status === 'confirmed') return;
    const result = await groupService.toggleVote(placeId, userId);
    if (result.success) {
      const placeData = await groupService.getGroupPlaces(groupId!);
      setPlaces(placeData);
    }
  };

  const handleDeletePlace = (placeId: string, name: string) => {
    setPlaceToDelete({ id: placeId, name });
  };

  const executeDeletePlace = async () => {
    if (!placeToDelete) return;
    
    const result = await groupService.deletePlace(placeToDelete.id);
    if (result.success) {
      const placeData = await groupService.getGroupPlaces(groupId!);
      setPlaces(placeData);
      setPlaceToDelete(null);
    } else {
      alert(result.message);
      setPlaceToDelete(null);
    }
  };

  const handleConfirmPlace = async (placeId: string, currentStatus: boolean) => {
    if (!isCreator || group?.status === 'confirmed') return;
    const result = await groupService.updatePlaceConfirmation(placeId, !currentStatus);
    if (result.success) {
      const placeData = await groupService.getGroupPlaces(groupId!);
      setPlaces(placeData);
    }
  };

  const handleFinalize = (confirmedDateStr: string) => {
    if (!isCreator || !groupId) return;
    setDateToFinalize(confirmedDateStr);
  };

  const executeFinalize = async () => {
    if (!isCreator || !groupId || !dateToFinalize) return;

    setIsFinalizing(true);
    const result = await groupService.finalizeGroup(groupId, dateToFinalize);
    setIsFinalizing(false);

    if (result.success) {
      alert(result.message);
      setIsFinalizeDialogOpen(false);
      setDateToFinalize(null);
      fetchGroupData(); // 데이터 새로고침
    } else {
      alert(result.message);
      setDateToFinalize(null);
    }
  };

  const handleQuickAddItinerary = async () => {
    if (!groupId || !userId) return;

    setIsAddingItin(true);
    let nextTime = '09:00';
    const dayItems = itinerary.filter(item => item.day_number === activeDay);
    if (dayItems.length > 0) {
      const lastItem = dayItems[dayItems.length - 1];
      const [h, m] = lastItem.time.split(':').map(Number);
      const newTotal = Math.min((h * 60 + m) + 60, 24 * 60 - 1); // 1시간 뒤
      const newH = String(Math.floor(newTotal / 60)).padStart(2, '0');
      const newM = String(newTotal % 60).padStart(2, '0');
      nextTime = `${newH}:${newM}`;
    }

    const result = await groupService.addItineraryItem(
      groupId,
      userId,
      nextTime,
      undefined,
      '새로운 할 일',
      undefined,
      activeDay
    );
    setIsAddingItin(false);

    if (result.success && result.data) {
      const itineraryData = await groupService.getItinerary(groupId);
      setItinerary(itineraryData);
      
      const newItem = itineraryData.find(item => item.id === result.data!.id) || result.data;
      
      // 즉시 새로 생성된 일정의 'place' 필드 에디트 모드 가동!
      setEditingItemId(newItem.id);
      setEditingField('place');
      setEditItinCustomPlace('새로운 할 일');
    } else {
      alert(result.message || '일정 추가 중 오류가 발생했습니다.');
    }
  };

  const saveField = async (item: ItineraryItem, field: 'time' | 'place' | 'memo', value: string) => {
    const originalText = field === 'place' 
      ? (item.place_id ? item.group_places?.name : item.custom_place) 
      : (field === 'memo' ? item.memo : item.time);
      
    let finalValue = value;
    if (field === 'place') {
      finalValue = value.trim() === '' ? (originalText || '새로운 할 일') : value.trim();
    } else if (field === 'time') {
      finalValue = !value ? (originalText || '09:00') : value;
    } else if (field === 'memo') {
      finalValue = value.trim() === '' ? '' : value.trim();
    }

    const isSame = (originalText || '') === finalValue;

    if (isSame) {
      setEditingItemId('');
      setEditingField(null);
      return;
    }

    const timeToSubmit = field === 'time' ? finalValue : item.time;
    let placeIdToSubmit = item.place_id;
    let customPlaceToSubmit = item.custom_place;
    
    if (field === 'place') {
      placeIdToSubmit = undefined;
      customPlaceToSubmit = finalValue;
    }
    
    const memoToSubmit = field === 'memo' ? (finalValue || undefined) : item.memo;

    // 즉시 UI 낙관적 업데이트
    const updatedItinerary = itinerary.map(itin => {
      if (itin.id === item.id) {
        return {
          ...itin,
          time: timeToSubmit,
          place_id: placeIdToSubmit,
          custom_place: customPlaceToSubmit,
          memo: memoToSubmit,
        };
      }
      return itin;
    });
    
    setItinerary(updatedItinerary.sort((a, b) => a.time.localeCompare(b.time)));

    setEditingItemId('');
    setEditingField(null);

    const result = await groupService.updateItineraryItem(
      item.id,
      timeToSubmit,
      placeIdToSubmit,
      customPlaceToSubmit,
      memoToSubmit
    );

    if (!result.success) {
      alert(result.message || '일정 저장에 실패했습니다.');
      const itineraryData = await groupService.getItinerary(groupId!);
      setItinerary(itineraryData);
    }
  };

  const handleDeleteItinerary = async (itemId: string) => {
    if (!confirm('일정을 삭제하시겠습니까?')) return;
    const result = await groupService.deleteItineraryItem(itemId);
    if (result.success) {
      const itineraryData = await groupService.getItinerary(groupId!);
      setItinerary(itineraryData);
    } else {
      alert(result.message);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const dayItems = itinerary.filter(item => item.day_number === activeDay);
    const otherItems = itinerary.filter(item => item.day_number !== activeDay);

    const [reorderedItem] = dayItems.splice(result.source.index, 1);
    dayItems.splice(result.destination.index, 0, reorderedItem);

    // 시간 재계산 (간단히 30분 간격으로 재배치하는 예시)
    let updatedDayItems = dayItems;
    if (dayItems.length > 0) {
      const baseTime = dayItems[0].time; // 첫 번째 항목 시간 기준
      const [hours, minutes] = baseTime.split(':').map(Number);
      
      updatedDayItems = dayItems.map((item, index) => {
        const totalMinutes = hours * 60 + minutes + (index * 30);
        const newHours = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
        const newMinutes = String(totalMinutes % 60).padStart(2, '0');
        return { ...item, time: `${newHours}:${newMinutes}` };
      });
    }

    const merged = [...otherItems, ...updatedDayItems].sort((a, b) => {
      if (a.day_number !== b.day_number) return a.day_number - b.day_number;
      return a.time.localeCompare(b.time);
    });

    // 낙관적 UI 업데이트
    setItinerary(merged);

    // 서버 반영
    if (updatedDayItems.length > 0) {
      const res = await groupService.updateItineraryTimes(
        updatedDayItems.map(item => ({ id: item.id, time: item.time }))
      );
      
      if (!res.success) {
        alert('순서 저장에 실패했습니다. 페이지를 새로고침해주세요.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <p className="text-xl font-semibold">그룹을 찾을 수 없습니다.</p>
        <Button onClick={() => navigate('/dashboard')}>대시보드로 돌아가기</Button>
      </div>
    );
  }

  const isConfirmed = group.status === 'confirmed';
  const filteredItinerary = itinerary.filter(item => item.day_number === activeDay);

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* Top Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                {group.name}
                {isConfirmed ? (
                  <Badge className="bg-green-500 hover:bg-green-600">확정됨</Badge>
                ) : (
                  <Badge variant="secondary">일정 조율 중</Badge>
                )}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              className="flex gap-2 font-semibold"
              onClick={() => {
                navigator.clipboard.writeText(group.invite_code);
                alert('초대 코드가 복사되었습니다: ' + group.invite_code);
              }}
            >
              <Share2 className="h-4 w-4" />
              초대 코드 복사
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        {isConfirmed && (
          <Card className="mb-8 border-green-200 bg-green-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CircleCheck className="h-6 w-6" />
                여행 일정이 확정되었습니다!
              </CardTitle>
              <CardDescription className="text-green-600 font-medium text-lg">
                일시: {group.confirmed_date}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-4">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            <Tabs defaultValue={isConfirmed ? "itinerary" : "dates"} className="w-full">
              <TabsList className={cn("grid w-full mb-8", isConfirmed ? "grid-cols-3" : "grid-cols-2")}>
                {isConfirmed && (
                  <TabsTrigger value="itinerary" className="flex gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    일정표
                  </TabsTrigger>
                )}
                <TabsTrigger value="dates" className="flex gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  날짜 {isConfirmed ? '확인' : '조율'}
                </TabsTrigger>
                <TabsTrigger value="places" className="flex gap-2">
                  <MapPin className="h-4 w-4" />
                  장소 {isConfirmed ? '확인' : '투표'}
                </TabsTrigger>
              </TabsList>
              
              {isConfirmed && (
                <TabsContent value="itinerary" className="space-y-6">
                  <div className="space-y-4 pt-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                      타임라인
                    </h3>

                    {/* 일차 선택 서브 탭 (동적 생성) */}
                    {confirmedDates.length > 1 && (
                      <div className="flex flex-wrap gap-2 mb-6 bg-muted/40 p-2 rounded-lg border border-muted/50 w-fit">
                        {confirmedDates.map((date, idx) => {
                          const dayNum = idx + 1;
                          const formattedDate = format(date, 'MM/dd');
                          const isSelected = activeDay === dayNum;
                          return (
                            <Button
                              key={dayNum}
                              type="button"
                              variant={isSelected ? 'default' : 'secondary'}
                              size="sm"
                              className={cn(
                                "h-8 px-3 rounded-md font-semibold text-xs transition-all cursor-pointer",
                                isSelected ? "shadow-sm font-bold bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                              )}
                              onClick={() => setActiveDay(dayNum)}
                            >
                              {dayNum}일차 ({formattedDate})
                            </Button>
                          );
                        })}
                      </div>
                    )}
                    
                    <div className="relative border-l-2 border-muted ml-4 pl-6 space-y-8 py-4">
                      {filteredItinerary.length > 0 && (
                        <DragDropContext onDragEnd={handleDragEnd}>
                          <Droppable droppableId="itinerary-list">
                            {(provided) => (
                              <div 
                                className="space-y-8"
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                              >
                                {filteredItinerary.map((item, index) => {
                                  const canDelete = item.user_id === userId || isCreator;
                                  const placeName = item.place_id ? item.group_places?.name : item.custom_place;

                                  return (
                                    <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={!isCreator}>
                                      {(provided) => (
                                        <div 
                                          className="relative group flex items-start gap-4"
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                        >
                                          {/* 드래그 핸들 (방장만 표시) */}
                                          {isCreator && (
                                            <div 
                                              {...provided.dragHandleProps}
                                              className="absolute -left-12 top-6 text-muted-foreground hover:text-primary cursor-grab active:cursor-grabbing p-1 bg-background rounded-md z-10"
                                            >
                                              <GripVertical className="h-4 w-4" />
                                            </div>
                                          )}

                                          {/* 타임라인 점 */}
                                          <div className="absolute w-4 h-4 bg-background border-2 border-primary rounded-full -left-[33px] top-7" />
                                          
                                          <Card className="flex-1 hover:border-primary/50 transition-colors bg-background">
                                            <CardContent className="p-4 sm:p-6 relative">
                                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {canDelete && (
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                                    onClick={() => handleDeleteItinerary(item.id)}
                                                    title="일정 삭제"
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </Button>
                                                )}
                                              </div>
                                              
                                              <div className="flex flex-col gap-2">
                                                {/* 시간 편집 분기 */}
                                                {editingItemId === item.id && editingField === 'time' ? (
                                                  <div className="flex items-center gap-1.5 inline-block">
                                                    <Input
                                                      type="time"
                                                      value={editItinTime}
                                                      onChange={(e) => setEditItinTime(e.target.value)}
                                                      onBlur={() => saveField(item, 'time', editItinTime)}
                                                      onFocus={(e) => e.target.select()}
                                                      onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveField(item, 'time', editItinTime);
                                                        if (e.key === 'Escape') { setEditingItemId(''); setEditingField(null); }
                                                      }}
                                                      className="w-[100px] h-8 text-sm font-bold text-primary px-1 bg-background"
                                                      autoFocus
                                                    />
                                                    <Button 
                                                      type="button" 
                                                      variant="outline" 
                                                      size="sm"
                                                      onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setEditItinTime(prev => adjustTimeString(prev, -30));
                                                      }}
                                                      className="px-1.5 h-8 text-[10px] cursor-pointer"
                                                    >
                                                      -30
                                                    </Button>
                                                    <Button 
                                                      type="button" 
                                                      variant="outline" 
                                                      size="sm"
                                                      onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setEditItinTime(prev => adjustTimeString(prev, 30));
                                                      }}
                                                      className="px-1.5 h-8 text-[10px] cursor-pointer"
                                                    >
                                                      +30
                                                    </Button>
                                                  </div>
                                                ) : (
                                                  <span 
                                                    className="text-xl font-bold text-primary cursor-pointer hover:bg-muted/70 px-1.5 py-0.5 rounded transition-colors w-fit"
                                                    onClick={() => {
                                                      setEditingItemId(item.id);
                                                      setEditingField('time');
                                                      setEditItinTime(item.time);
                                                    }}
                                                    title="시간 클릭하여 바로 수정"
                                                  >
                                                    {item.time}
                                                  </span>
                                                )}

                                                {/* 할 일 / 장소 편집 분기 */}
                                                {editingItemId === item.id && editingField === 'place' ? (
                                                  <Input
                                                    value={editItinCustomPlace}
                                                    onChange={(e) => setEditItinCustomPlace(e.target.value)}
                                                    onBlur={() => saveField(item, 'place', editItinCustomPlace)}
                                                    onFocus={(e) => e.target.select()}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') saveField(item, 'place', editItinCustomPlace);
                                                      if (e.key === 'Escape') { setEditingItemId(''); setEditingField(null); }
                                                    }}
                                                    className="flex-1 h-8 text-sm font-semibold bg-background"
                                                    placeholder="할 일 또는 장소 입력"
                                                    autoFocus
                                                  />
                                                ) : (
                                                  <h4 
                                                    className="text-lg font-semibold flex items-center gap-2 cursor-pointer hover:bg-muted/70 px-1.5 py-0.5 rounded transition-colors w-fit"
                                                    onClick={() => {
                                                      setEditingItemId(item.id);
                                                      setEditingField('place');
                                                      setEditItinCustomPlace(placeName || '');
                                                    }}
                                                    title="할 일 또는 장소 클릭하여 바로 수정"
                                                  >
                                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                                    {placeName}
                                                  </h4>
                                                )}
                                              </div>

                                              {/* 메모 편집 분기 */}
                                              {editingItemId === item.id && editingField === 'memo' ? (
                                                <Input
                                                  value={editItinMemo}
                                                  onChange={(e) => setEditItinMemo(e.target.value)}
                                                  onBlur={() => saveField(item, 'memo', editItinMemo)}
                                                  onFocus={(e) => e.target.select()}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveField(item, 'memo', editItinMemo);
                                                    if (e.key === 'Escape') { setEditingItemId(''); setEditingField(null); }
                                                  }}
                                                  className="w-full h-8 text-xs mt-2 bg-background"
                                                  placeholder="메모 입력 (비워두면 삭제)..."
                                                  autoFocus
                                                />
                                              ) : (
                                                <div 
                                                  onClick={() => {
                                                    setEditingItemId(item.id);
                                                    setEditingField('memo');
                                                    setEditItinMemo(item.memo || '');
                                                  }}
                                                  className="cursor-pointer group/memo mt-2"
                                                  title="메모 클릭하여 바로 수정"
                                                >
                                                  {item.memo ? (
                                                    <p className="text-sm text-muted-foreground bg-muted/50 hover:bg-muted/80 p-3 rounded-md transition-colors">
                                                      {item.memo}
                                                    </p>
                                                  ) : (
                                                    <p className="text-xs text-muted-foreground/40 italic pl-6 group-hover/memo:text-primary transition-colors">
                                                      + 메모 추가...
                                                    </p>
                                                  )}
                                                </div>
                                              )}

                                              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t pt-2 mt-3">
                                                <span className="flex items-center gap-1">
                                                  등록: {item.users?.nickname}
                                                </span>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>
                      )}

                      {/* 퀵 일정 추가 버튼 */}
                      <div className="relative pt-4">
                        <div className="absolute w-4 h-4 bg-background border-2 border-muted rounded-full -left-[33px] top-11" />
                        
                        <Button 
                          variant="outline" 
                          className="w-full h-16 border-dashed text-muted-foreground hover:text-primary hover:border-primary gap-2 cursor-pointer font-semibold shadow-sm hover:bg-primary/5 transition-all"
                          onClick={handleQuickAddItinerary}
                          disabled={isAddingItin}
                        >
                          {isAddingItin ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          ) : (
                            <PlusCircle className="h-5 w-5 text-primary" />
                          )}
                          새 일정 즉시 추가 (1시간 뒤)
                        </Button>
                      </div>
                    </div>
                    
                    {filteredItinerary.length === 0 && !isAddingItin && (
                      <p className="text-center py-8 text-muted-foreground text-sm">
                        아직 이 날짜에 등록된 일정이 없습니다. <br/>'+ 새 일정 즉시 추가' 버튼을 눌러 첫 번째 일정을 추가해보세요!
                      </p>
                    )}
                  </div>
                </TabsContent>
              )}

              <TabsContent value="dates" className="space-y-6">
                {isConfirmed ? (
                  <Card className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                      <CalendarIcon className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold">{group.confirmed_date}</p>
                      <p className="text-muted-foreground">멤버들이 함께 정한 여행 날짜입니다.</p>
                    </div>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                    <Card className="lg:col-span-3">
                      <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <CardTitle>내 일정 입력</CardTitle>
                            <CardDescription>가능한 날짜와 불가능한 날짜를 표시해주세요.</CardDescription>
                          </div>
                          <div className="flex bg-muted p-1 rounded-lg">
                            <Button 
                              variant={selectionMode === 'available' ? 'default' : 'ghost'} 
                              size="sm"
                              className="h-8 text-xs gap-1.5"
                              onClick={() => setSelectionMode('available')}
                            >
                              <Check className="h-3 w-3" /> 가능
                            </Button>
                            <Button 
                              variant={selectionMode === 'unavailable' ? 'destructive' : 'ghost'} 
                              size="sm"
                              className="h-8 text-xs gap-1.5"
                              onClick={() => setSelectionMode('unavailable')}
                            >
                              <XCircle className="h-3 w-3" /> 불가능
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex justify-center p-0 pb-6">
                        <Calendar
                          mode="multiple"
                          selected={selectionMode === 'available' ? selectedAvailable : selectedUnavailable}
                          onSelect={(dates) => {
                            if (selectionMode === 'available') {
                              setSelectedAvailable(dates || []);
                              // 불가능 날짜에서 제거
                              setSelectedUnavailable(prev => (dates || []).reduce((acc, d) => {
                                return acc.filter(x => format(x, 'yyyy-MM-dd') !== format(d, 'yyyy-MM-dd'));
                              }, prev));
                            } else {
                              setSelectedUnavailable(dates || []);
                              // 가능 날짜에서 제거
                              setSelectedAvailable(prev => (dates || []).reduce((acc, d) => {
                                return acc.filter(x => format(x, 'yyyy-MM-dd') !== format(d, 'yyyy-MM-dd'));
                              }, prev));
                            }
                          }}
                          modifiers={{
                            available: selectedAvailable,
                            unavailable: selectedUnavailable
                          }}
                          modifiersClassNames={{
                            available: selectionMode === 'available' ? "" : "bg-primary/20 text-primary border-primary/50",
                            unavailable: selectionMode === 'unavailable' ? "" : "bg-destructive/20 text-destructive border-destructive/50"
                          }}
                          className="rounded-md border shadow"
                        />
                      </CardContent>
                      <CardFooter className="border-t pt-6 bg-muted/20">
                        <Button className="w-full gap-2" onClick={handleSaveAvailability} disabled={isSaving}>
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          일정 저장하기
                        </Button>
                      </CardFooter>
                    </Card>

                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle>그룹 일정 현황</CardTitle>
                        <CardDescription>가장 선호되는 날짜 순입니다.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {allAvailability.length > 0 ? (
                            <div className="space-y-4">
                              {Array.from(new Set(allAvailability.map(a => a.available_date)))
                                .sort((a, b) => {
                                  const availA = allAvailability.filter(x => x.available_date === a && x.type === 'available').length;
                                  const unavailA = allAvailability.filter(x => x.available_date === a && x.type === 'unavailable').length;
                                  const scoreA = availA - unavailA;

                                  const availB = allAvailability.filter(x => x.available_date === b && x.type === 'available').length;
                                  const unavailB = allAvailability.filter(x => x.available_date === b && x.type === 'unavailable').length;
                                  const scoreB = availB - unavailB;
                                  
                                  return scoreB - scoreA;
                                })
                                .slice(0, 8)
                                .map(dateStr => {
                                  const availCount = allAvailability.filter(a => a.available_date === dateStr && a.type === 'available').length;
                                  const unavailCount = allAvailability.filter(a => a.available_date === dateStr && a.type === 'unavailable').length;
                                  const percentAvail = (availCount / members.length) * 100;
                                  
                                  return (
                                    <div key={dateStr} className="space-y-1">
                                      <div className="flex justify-between items-end">
                                        <span className="text-xs font-mono">{dateStr}</span>
                                        <div className="flex gap-2 items-center">
                                          {unavailCount > 0 && (
                                            <span className="text-[10px] font-bold text-destructive flex items-center gap-0.5">
                                              <XCircle className="h-2 w-2" />{unavailCount}
                                            </span>
                                          )}
                                          <span className="text-xs font-bold text-primary flex items-center gap-0.5">
                                            <Check className="h-2.5 w-2.5" />{availCount}명 가능
                                          </span>
                                        </div>
                                      </div>
                                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                                        <div 
                                          className="h-full bg-primary transition-all" 
                                          style={{ width: `${percentAvail}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                              <CalendarIcon className="h-10 w-10 mb-2 opacity-20" />
                              <p className="text-sm">일정을 먼저 저장해보세요!</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="places" className="space-y-6">
                {!isConfirmed && (
                  <Card>
                    <CardHeader>
                      <CardTitle>가고 싶은 장소 추천</CardTitle>
                      <CardDescription>멤버들과 공유하고 싶은 장소를 추가해보세요.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddPlace} className="flex flex-col gap-4 sm:flex-row items-end">
                        <div className="flex-1 grid gap-2 w-full">
                          <Label htmlFor="placeName">장소 이름</Label>
                          <Input
                            id="placeName"
                            placeholder="예: 성산일출봉, 맛집 탐방 등"
                            value={newPlaceName}
                            onChange={(e) => setNewPlaceName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="flex-[1.5] grid gap-2 w-full">
                          <Label htmlFor="placeDesc">메모 (선택사항)</Label>
                          <Input
                            id="placeDesc"
                            placeholder="추천 이유나 상세 정보를 적어주세요."
                            value={newPlaceDesc}
                            onChange={(e) => setNewPlaceDesc(e.target.value)}
                          />
                        </div>
                        <Button type="submit" className="w-full sm:w-auto" disabled={isAddingPlace || !newPlaceName.trim()}>
                          {isAddingPlace ? <Loader2 className="h-4 w-4 animate-spin" /> : '추천하기'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    {isConfirmed ? '최종 확정된 장소' : `추천된 장소 (${places.length})`}
                  </h3>
                  {places.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {places
                        .filter(p => !isConfirmed || p.is_confirmed)
                        .map((place) => {
                        const isVoted = place.place_votes?.some((v: any) => v.user_id === userId);
                        const voteCount = place.place_votes?.length || 0;
                        const confirmed = place.is_confirmed;

                        return (
                          <Card key={place.id} className={cn(
                            "transition-all relative", 
                            confirmed ? "border-green-500 bg-green-50/50" : isVoted ? "border-primary/50 bg-primary/5" : ""
                          )}>
                            {!isConfirmed && (place.suggested_by === userId || isCreator) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive transition-colors"
                                onClick={() => handleDeletePlace(place.id, place.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}

                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start pr-8">
                                <div>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    {place.name}
                                    {confirmed && <CircleCheck className="h-4 w-4 text-green-600" />}
                                  </CardTitle>
                                  <CardDescription className="mt-1">{place.description || '상세 정보 없음'}</CardDescription>
                                </div>
                                <Badge variant="secondary" className="text-[10px]">
                                  {place.users.nickname} 추천
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardFooter className="pt-2 flex justify-between items-center">
                              <div className="text-sm font-medium text-primary">
                                {voteCount}명이 가고 싶어해요
                              </div>
                              {!isConfirmed ? (
                                <div className="flex gap-2">
                                  {isCreator && (
                                    <Button 
                                      variant={confirmed ? "default" : "outline"} 
                                      size="sm" 
                                      className={cn("gap-2", confirmed ? "bg-green-600 hover:bg-green-700" : "text-green-600 border-green-200 hover:bg-green-50")}
                                      onClick={() => handleConfirmPlace(place.id, confirmed)}
                                    >
                                      {confirmed ? '확정 취소' : '장소 확정'}
                                    </Button>
                                  )}
                                  <Button 
                                    variant={isVoted ? "default" : "outline"} 
                                    size="sm" 
                                    className="gap-2"
                                    onClick={() => handleVote(place.id)}
                                  >
                                    {isVoted ? <Check className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                                    {isVoted ? '취소' : '투표'}
                                  </Button>
                                </div>
                              ) : (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">방문 예정</Badge>
                              )}
                            </CardFooter>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <Card className="py-12">
                      <CardContent className="flex flex-col items-center justify-center text-center text-muted-foreground">
                        <MapPin className="h-10 w-10 mb-2 opacity-20" />
                        <p>아직 추천된 장소가 없습니다.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  참여 멤버 ({members.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {members.map((member) => {
                    const hasSubmitted = allAvailability.some(a => a.user_id === member.id);
                    return (
                      <li key={member.id} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {member.nickname[0]}
                        </div>
                        <span className="text-sm font-medium">
                          {member.nickname} {member.id === userId && '(나)'}
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          {member.role === '방장' ? (
                            <Badge variant="outline" className="text-[10px] py-0 bg-amber-50 text-amber-600 border-amber-200 gap-1">
                              <Crown className="h-2 w-2" /> 방장
                            </Badge>
                          ) : hasSubmitted ? (
                            <Badge variant="outline" className="text-[10px] py-0 border-green-500 text-green-600 gap-1">
                              <Check className="h-2 w-2" /> 완료
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0 opacity-50">미정</Badge>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>

            <Card className={cn("transition-all", isConfirmed ? "bg-green-50 border-green-200" : "bg-primary/5 border-primary/20")}>
              <CardHeader className="pb-2">
                <CardTitle className={cn("text-xs font-bold uppercase tracking-wider", isConfirmed ? "text-green-700" : "text-primary")}>
                  진행 현황
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>전체 진행률</span>
                    <span>{isConfirmed ? '100%' : '66%'}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all", isConfirmed ? "bg-green-500" : "bg-primary")} 
                      style={{ width: isConfirmed ? '100%' : '66%' }}
                    ></div>
                  </div>
                </div>

                {isConfirmed ? (
                  <div className="pt-2 space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-green-600 uppercase">확정 날짜</p>
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <CalendarIcon className="h-3 w-3" />
                        {group.confirmed_date}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-green-600 uppercase">확정 장소</p>
                      <div className="flex flex-wrap gap-1">
                        {places.filter(p => p.is_confirmed).map(p => (
                          <Badge key={p.id} variant="secondary" className="text-[10px] bg-white border-green-200 text-green-700">
                            {p.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center text-[10px] text-white">
                        <Check className="h-2 w-2" />
                      </div>
                      <span className="text-green-700 font-medium">날짜 및 장소 조율 완료</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className={cn("h-4 w-4 rounded-full flex items-center justify-center text-[10px]", isConfirmed ? "bg-green-500 text-white" : "bg-primary text-white animate-pulse")}>
                        {isConfirmed ? <Check className="h-2 w-2" /> : '2'}
                      </div>
                      <span className={cn(isConfirmed ? "text-green-700 font-medium" : "font-bold")}>
                        {isConfirmed ? '일정 최종 확정 완료' : '최종 확정 대기 중'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
              {!isConfirmed && isCreator && (
                <CardFooter className="pt-0">
                  <Dialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full gap-2 bg-primary hover:bg-primary/90" 
                        disabled={isFinalizing}
                      >
                        <Flag className="h-4 w-4" />
                        일정 최종 확정하기
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>최종 여행 날짜 선택</DialogTitle>
                        <DialogDescription>
                          멤버들의 투표 결과입니다. 최종 여행 날짜를 하나 선택해주세요.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4 max-h-[40vh] overflow-y-auto">
                        {Array.from(new Set(allAvailability.map(a => a.available_date)))
                          .sort((a, b) => {
                            const availA = allAvailability.filter(x => x.available_date === a && x.type === 'available').length;
                            const unavailA = allAvailability.filter(x => x.available_date === a && x.type === 'unavailable').length;
                            const scoreA = availA - unavailA;

                            const availB = allAvailability.filter(x => x.available_date === b && x.type === 'available').length;
                            const unavailB = allAvailability.filter(x => x.available_date === b && x.type === 'unavailable').length;
                            const scoreB = availB - unavailB;
                            
                            return scoreB - scoreA;
                          })
                          .map(dateStr => {
                            const availCount = allAvailability.filter(a => a.available_date === dateStr && a.type === 'available').length;
                            const unavailCount = allAvailability.filter(a => a.available_date === dateStr && a.type === 'unavailable').length;
                            const dateObj = parseISO(dateStr);
                            const formatted = format(dateObj, 'yyyy년 MM월 dd일 (eeee)', { locale: ko });
                            
                            return (
                              <Button 
                                key={dateStr}
                                variant="outline" 
                                className="justify-between h-auto py-4 px-6 group hover:border-primary transition-all"
                                onClick={() => handleFinalize(formatted)}
                              >
                                <div className="text-left">
                                  <p className="font-bold">{formatted}</p>
                                  <div className="flex gap-3 mt-1">
                                    <p className="text-xs text-primary font-bold flex items-center gap-1">
                                      <Check className="h-3 w-3" /> {availCount}명 가능
                                    </p>
                                    {unavailCount > 0 && (
                                      <p className="text-xs text-destructive font-bold flex items-center gap-1">
                                        <XCircle className="h-3 w-3" /> {unavailCount}명 불가능
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all" />
                              </Button>
                            );
                          })}
                        {allAvailability.length === 0 && (
                          <p className="text-center py-8 text-muted-foreground text-sm">
                            등록된 가능 일정이 없습니다.<br/>먼저 날짜 조율을 진행해주세요.
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      </main>

      {/* 장소 삭제 확인 모달 */}
      <AlertDialog open={!!placeToDelete} onOpenChange={(open) => !open && setPlaceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>장소 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 '{placeToDelete?.name}' 장소를 삭제하시겠습니까?<br/>이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeletePlace} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 일정 확정 확인 모달 */}
      <AlertDialog open={!!dateToFinalize} onOpenChange={(open) => !open && setDateToFinalize(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>일정 최종 확정</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-bold text-foreground">{dateToFinalize}</span>(으)로 일정을 최종 확정하시겠습니까?<br/>
              확정 후에는 날짜와 장소를 더 이상 변경할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={executeFinalize}>
              확정하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GroupPage;