import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Calendar, MapPin, Users, Settings, Share2 } from 'lucide-react';

const GroupPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Header */}
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                여행 그룹: {groupId}
                <Badge variant="secondary">일정 조율 중</Badge>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
              <Share2 className="h-4 w-4" />
              공유하기
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            <Tabs defaultValue="dates" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="dates" className="flex gap-2">
                  <Calendar className="h-4 w-4" />
                  날짜 조율
                </TabsTrigger>
                <TabsTrigger value="places" className="flex gap-2">
                  <MapPin className="h-4 w-4" />
                  장소 투표
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="dates">
                <Card>
                  <CardHeader>
                    <CardTitle>가능한 날짜를 선택해주세요</CardTitle>
                    <CardDescription>모두가 가능한 최적의 날짜를 찾고 있습니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="min-h-[300px] flex flex-col items-center justify-center text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">여기에 캘린더 컴포넌트가 들어갈 예정입니다.</p>
                    <Button className="mt-4" variant="outline">날짜 추가하기</Button>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="places">
                <Card>
                  <CardHeader>
                    <CardTitle>가고 싶은 장소에 투표하세요</CardTitle>
                    <CardDescription>가장 인기 있는 장소 위주로 일정을 짭니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="min-h-[300px] flex flex-col items-center justify-center text-center">
                    <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">아직 등록된 장소가 없습니다.</p>
                    <Button className="mt-4" variant="outline">장소 추천하기</Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  참여 멤버 (3)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">나</div>
                    <span className="text-sm font-medium">홍길동 (방장)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">김</div>
                    <span className="text-sm">김철수</span>
                    <Badge variant="outline" className="ml-auto text-[10px] py-0">준비완료</Badge>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">이</div>
                    <span className="text-sm">이영희</span>
                  </li>
                </ul>
                <Button variant="link" className="w-full mt-4 text-xs h-auto p-0">멤버 더 보기</Button>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-primary uppercase tracking-wider">진행 현황</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>전체 진행률</span>
                    <span>33%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-1/3 transition-all"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs opacity-100">
                    <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center text-[10px] text-white">1</div>
                    <span className="font-bold">날짜 조율 (진행 중)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs opacity-50">
                    <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[10px]">2</div>
                    <span>장소 투표</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs opacity-50">
                    <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[10px]">3</div>
                    <span>최종 확정</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GroupPage;
