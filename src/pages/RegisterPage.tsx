import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { userService } from '@/services/userService';
import { AlertCircle } from 'lucide-react';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({ id: '', nickname: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id.trim() || !formData.nickname.trim()) return;

    setLoading(true);
    setError(null);

    const result = await userService.createUser(formData.id, formData.nickname);
    
    setLoading(false);
    if (result.success) {
      alert('회원가입이 완료되었습니다! 로그인해주세요.');
      navigate('/login');
    } else {
      console.error('Registration failed:', result.message);
      setError(result.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center">회원가입</CardTitle>
          <CardDescription className="text-center">
            고유 아이디와 사용하실 닉네임을 설정해주세요.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="grid gap-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="id">아이디</Label>
              <Input
                id="id"
                type="text"
                placeholder="영문, 숫자 권장"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nickname">닉네임</Label>
              <Input
                id="nickname"
                type="text"
                placeholder="화면에 표시될 이름"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full text-lg h-12" disabled={loading}>
              {loading ? '가입 중...' : '회원가입'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                로그인하기
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default RegisterPage;
