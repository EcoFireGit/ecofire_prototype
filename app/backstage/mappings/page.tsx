"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PiJobMappingPage from "@/components/mapping/pi-job-mapping";
import PIQBOMappingsPage from "@/components/mapping/pi-qbo-mapping";

export default function PiQboMappingPage() {
  return (
    <Tabs defaultValue="pi-job" className="w-auto ml-5">
      <TabsList>
        <TabsTrigger value="pi-job">Job to Output mapping</TabsTrigger>
        <TabsTrigger value="pi-qbo">Output to Outcome mapping</TabsTrigger>
      </TabsList>
      <TabsContent value="pi-job">
        <PiJobMappingPage />
      </TabsContent>
      <TabsContent value="pi-qbo">
        <PIQBOMappingsPage />
      </TabsContent>
    </Tabs>
  );
}
