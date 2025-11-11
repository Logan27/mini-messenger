import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import { Bookmark, ArrowLeft } from 'lucide-react';

export default function SavedMessages() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl md:text-2xl font-bold">Saved Messages</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Saved Messages</CardTitle>
              <CardDescription>
                Your personal message storage space
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Bookmark}
                title="No saved messages"
                description="Save important messages to access them later"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
