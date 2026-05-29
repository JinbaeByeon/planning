import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, LogOut, MapPin, Search, Calendar, ChevronRight, Copy } from 'lucide-react';
import { groupService } from '@/services/groupService';
import type { TravelGroup } from '@/services/groupService';

const DashboardPage: React.FC = () => {
  const userId = localStorage.getItem('travel_user_id');
  const userNickname = localStorage.getItem('travel_user_nickname') || userId;
  const navigate = useNavigate();

  const [groups, setGroups] = useState<TravelGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchGroups();
    }
  }, [userId]);

  const fetchGroups = async () => {
    if (!userId) return;
    const myGroups = await groupService.getMyGroups(userId);
    setGroups(myGroups);
  };

  const handleLogout = () => {
    localStorage.removeItem('travel_user_id');
    localStorage.removeItem('travel_user_nickname');
    navigate('/login');
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !userId) return;

    setIsCreating(true);
    const result = await groupService.createGroup(newGroupName, userId);
    setIsCreating(false);

    if (result.success && result.data) {
      setNewGroupName('');
      setIsDialogOpen(false);
      fetchGroups(); // 목록 새로고침
      navigate(`/group/${result.data.id}`);
    } else {
      alert(result.message);
    }
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim() || !userId) return;

    setIsJoining(true);
    const result = await groupService.joinGroup(joinCode, userId);
    setIsJoining(false);

    if (result.success && result.groupId) {
      setJoinCode('');
      fetchGroups();
      navigate(`/group/${result.groupId}`);
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header / Navigation */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-xl">
            <MapPin className="h-6 w-6 text-primary" />
            <span>TravelPlanner</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">
              {userNickname}님 환영합니다
            </span>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="로그아웃">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4 space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">반가워요, {userNickname}님!</h1>
          <p className="text-muted-foreground">새로운 여행을 계획하거나 기존 여행에 참여해보세요.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Action: Create New (Dialog Trigger) */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Card className="flex flex-col border-dashed bg-transparent hover:bg-background/50 transition-colors cursor-pointer group border-2">
                <CardHeader className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <PlusCircle className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors mb-4" />
                  <CardTitle>새 여행 그룹 생성</CardTitle>
                  <CardDescription>함께 여행할 친구들을 모아보세요.</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button className="w-full" variant="outline">그룹 만들기</Button>
                </CardFooter>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 여행 그룹 만들기</DialogTitle>
                <DialogDescription>
                  여행의 이름을 정해주세요. 나중에 언제든지 바꿀 수 있습니다.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGroup}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">여행 이름</Label>
                    <Input
                      id="name"
                      placeholder="예: 제주도 우정 여행, 일본 식도락 여행"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isCreating || !newGroupName.trim()}>
                    {isCreating ? '생성 중...' : '생성하기'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Action: Join with Code */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                초대 코드로 참여
              </CardTitle>
              <CardDescription>공유받은 코드가 있다면 바로 참여하세요.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <Input 
                placeholder="초대 코드 입력 (예: TRV-123)" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handleJoinGroup}
                disabled={isJoining || !joinCode.trim()}
              >
                {isJoining ? '참여 중...' : '참여하기'}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* List Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">내 여행 목록</h2>
          
          {groups.length > 0 ? (
            <div className="grid gap-4">
              {groups.map((group) => (
                <Link key={group.id} to={`/group/${group.id}`}>
                  <Card className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {group.name}
                            {group.status === 'confirmed' ? (
                              <Badge className="bg-green-500 hover:bg-green-600 text-[10px] py-0 font-medium h-4">확정됨</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] py-0 font-medium h-4">조율 중</Badge>
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                            초대 코드: <span className="font-mono font-medium">{group.invite_code}</span>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-muted"
                              onClick={(e) => {
                                e.preventDefault();
                                navigator.clipboard.writeText(group.invite_code);
                                alert('초대 코드가 복사되었습니다: ' + group.invite_code);
                              }}
                              title="초대 코드 복사"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="rounded-full bg-muted p-4">
                  <MapPin className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">참여 중인 여행이 없습니다.</p>
                  <p className="text-sm text-muted-foreground">위에 있는 '그룹 만들기'를 눌러 첫 일정을 시작해보세요!</p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
};

export default DashboardPage;
