"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskFeedView from "@/components/tasks/feed/task-feed-view";
import JobsPage from "@/components/jobs/job-feed-view";
export default function FeedPage() {
  return (
      <Tabs defaultValue="job" className="w-auto ml-5">
      <TabsList id="jobs-tasks-section">
        <TabsTrigger value="job">Job Feed</TabsTrigger>
        <TabsTrigger value="task">Task Feed</TabsTrigger>
      </TabsList>
      <TabsContent value="job">
        <JobsPage />
      </TabsContent>
      <TabsContent value="task">
        <TaskFeedView />
      </TabsContent>
    </Tabs>
  );
}
