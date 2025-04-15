"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

interface AppointmentNotificationProps {
  minutes?: number;
}

export const AppointmentNotification = ({ minutes = 15 }: AppointmentNotificationProps) => {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
 
  // Set up event listener for notification button click
  useEffect(() => {
    const handleShowNotification = () => {
      setVisible(true);
    };
   
    window.addEventListener('showAppointmentNotification', handleShowNotification);
   
    return () => {
      window.removeEventListener('showAppointmentNotification', handleShowNotification);
    };
  }, []);
 
  if (!visible) return null;
 
  return (
    <div className="fixed bottom-6 left-[17rem] z-50 bg-white rounded-lg shadow-lg p-4 max-w-md border border-blue-300 animate-in slide-in-from-bottom-10 duration-300">
      <div className="flex items-start gap-3">
        <div className="bg-blue-100 p-2 rounded-full">
          <Clock className="h-5 w-5 text-blue-600" />
        </div>
       
        <div className="flex-1">
          <p className="text-sm font-medium mb-1">Hey! 👋</p>
          <h4 className="font-medium text-base mb-1">Google calendar sync</h4>
          <p className="text-sm mb-1">
            You have an Doctor's appointment in <span className="text-green-600 font-medium">{minutes} mins</span>.
          </p>
          <p className="text-sm text-gray-600 mb-3">Do you want to reprioritize your tasks?</p>
         
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-[#f05523] text-[#f05523] hover:bg-[#f05523]/10"
              onClick={() => {
                setVisible(false);
                // Handle reprioritize - apply filter for quick tasks
                if (pathname === "/dashboard/jobs") {
                  // If on jobs page, apply filter directly
                  window.dispatchEvent(new CustomEvent('applyTimeFilter', {
                    detail: { minutes }
                  }));
                } else {
                  // Store time for filter and navigate to jobs page
                  sessionStorage.setItem('appointmentTime', minutes.toString());
                  router.push('/dashboard/jobs');
                }
              }}
            >
              Reprioritize
            </Button>
           
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisible(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentNotification;