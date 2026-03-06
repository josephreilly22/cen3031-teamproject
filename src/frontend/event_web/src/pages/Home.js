import { Button } from '@heroui/react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-16 text-center">
      <h1 className="text-4xl font-bold">Event Planner</h1>
      <p className="max-w-md text-default-500">
        Find events that match your interests, or create and manage your own.
      </p>
      <div className="flex gap-4">
        <Button as={Link} to="/login" variant="flat" size="lg">
          Login
        </Button>
        <Button as={Link} to="/register" color="primary" size="lg">
          Sign Up
        </Button>
      </div>
    </div>
  );
}

export default Home;
