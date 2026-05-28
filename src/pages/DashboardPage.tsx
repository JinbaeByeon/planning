import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { PlusCircle, LogOut, MapPin, Search } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const userId = localStorage.getItem('travel_user_id');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('travel_user_id');
    navigate('/login');
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
              {userId}님 환영합니다
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
          <h1 className="text-3xl font-bold tracking-tight">반가워요, {userId}님!</h1>
          <p className="text-muted-foreground">새로운 여행을 계획하거나 기존 여행에 참여해보세요.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Action: Create New */}
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
              <Input placeholder="초대 코드 입력 (예: TRV-123)" />
            </CardContent>
            <CardFooter>
              <Button className="w-full">참여하기</Button>
            </CardFooter>
          </Card>
        </div>

        {/* List Section (Empty State for now) */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">내 여행 목록</h2>
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
        </section>
      </main>
    </div>
  );
};

export default DashboardPage;
