import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/auth/AuthContext";
import { Layout } from "@/components/Layout";
import AllCourses from "./pages/AllCourses";
import MyCourses from "./pages/MyCourses";
import CourseView from "./pages/CourseView";
import NewCourse from "./pages/NewCourse";
import StudySession from "./pages/StudySession";
import Settings from "./pages/Settings";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<AllCourses />} />
              <Route path="/my-courses" element={<MyCourses />} />
              <Route path="/courses/new" element={<NewCourse />} />
              <Route path="/courses/:id" element={<CourseView />} />
              <Route path="/courses/:id/study" element={<StudySession />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/signup" element={<AuthPage mode="signup" />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
