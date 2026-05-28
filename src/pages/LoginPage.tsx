import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const LoginPage: React.FC = () => {
  const [userId, setUserId] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId.trim()) {
      localStorage.setItem('travel_user_id', userId);
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">여행 일정 조율</CardTitle>
          <CardDescription>
            동료들과 함께 여행을 계획하기 위해 닉네임을 입력해주세요.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nickname">닉네임</Label>
              <Input
                id="nickname"
                type="text"
                placeholder="홍길동"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                autoFocus
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full text-lg h-12" disabled={!userId.trim()}>
              시작하기
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;
