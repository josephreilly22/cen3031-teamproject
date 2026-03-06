import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Card, CardBody } from '@heroui/react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  // Mock submit - no backend yet
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login (mock):', { email, password });
    // Later: call API, then redirect to dashboard
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-sm py-12">
      <Card>
        <CardBody className="gap-4 p-6">
          <h1 className="text-xl font-semibold">Login</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onValueChange={setEmail}
              isRequired
            />
            <Input
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onValueChange={setPassword}
              isRequired
            />
            <Button type="submit" color="primary" className="w-full">
              Login
            </Button>
          </form>
          <p className="text-center text-sm text-default-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary underline">
              Sign up
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

export default Login;
