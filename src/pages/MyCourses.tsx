import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { CourseCard } from "@/components/CourseCard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingGrid } from "@/components/LoadingGrid";
import { Button } from "@/components/ui/button";

export default function MyCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "My Courses // VECTOR_NOIR";
    if (!user) navigate("/login?redirect=/my-courses", { replace: true });
  }, [user, navigate]);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["my-courses", user?.id],
    queryFn: () => (user ? api.myCourses(user.id) : Promise.resolve([])),
    enabled: !!user,
  });

  if (!user) return null;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          OPERATOR // {user.name}
        </div>
        <h1 className="font-display text-4xl md:text-6xl neon-text-magenta glitch">MY_COURSES</h1>
        <div className="h-px bg-gradient-to-r from-neon-magenta via-neon-cyan to-transparent" />
      </header>

      {isLoading ? (
        <LoadingGrid />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-10 w-10" />}
          title="NO_ACTIVE_DECKS"
          description="You haven't enrolled in any course yet. Browse the grid and start a session."
          action={
            <Button variant="cyber" onClick={() => navigate("/")}>Browse_All_Courses</Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((c) => (
            <div key={c.id} className="space-y-2">
              <CourseCard
                course={c}
                enrolled
                progress={c.progress}
                onPrimary={() => navigate(`/courses/${c.id}`)}
                onManage={() => navigate(`/courses/${c.id}?edit=1`)}
              />
              <div className="text-[10px] uppercase tracking-widest text-center">
                {c.progress >= 100 ? (
                  <span className="text-neon-green">// completed</span>
                ) : c.progress > 0 ? (
                  <span className="text-neon-cyan">// in_progress</span>
                ) : (
                  <span className="text-muted-foreground">// not_started</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
