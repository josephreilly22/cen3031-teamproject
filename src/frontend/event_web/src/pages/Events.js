import { Card, CardBody, Chip } from '@heroui/react';

function Events() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Find Events</h1>
      <p className="text-default-500">
        Events matching your interests will appear here. This page is ready for you to connect to your backend.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardBody>
            <h3 className="font-semibold">Sample Event</h3>
            <p className="text-sm text-default-500">Music • March 15, 2025</p>
            <div className="mt-2 flex gap-1">
              <Chip size="sm">Music</Chip>
              <Chip size="sm">Concert</Chip>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default Events;
