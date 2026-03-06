import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Card, CardBody, RadioGroup, Radio } from '@heroui/react';

// Mock only - no backend. User type is for when we add real signup.
const USER_TYPES = {
  seeker: 'Looking for events',
  planner: 'Event planner (creates events)',
};

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('seeker');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Register (mock):', { email, password, userType });
    // Later: call API, then redirect
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-sm py-12">
      <Card>
        <CardBody className="gap-4 p-6">
          <h1 className="text-xl font-semibold">Sign Up</h1>
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
            <RadioGroup
              label="I want to"
              value={userType}
              onValueChange={setUserType}
              className="gap-2"
            >
              <Radio value="seeker">{USER_TYPES.seeker}</Radio>
              <Radio value="planner">{USER_TYPES.planner}</Radio>
            </RadioGroup>
            <Button type="submit" color="primary" className="w-full">
              Create account
            </Button>
          </form>
          <p className="text-center text-sm text-default-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary underline">
              Login
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

export default Register;
