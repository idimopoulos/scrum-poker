import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Clock, BarChart3, LogIn, User } from "lucide-react";
import AuthHeader from "@/components/auth-header";
import GuestLoginModal from "@/components/guest-login-modal";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🃏</span>
              </div>
              <h1 className="text-xl font-semibold text-slate-800">Scrum Poker</h1>
            </div>
            <AuthHeader />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
            Plan Better,
            <span className="text-primary"> Estimate Smarter</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            Real-time Scrum poker for agile teams. Streamline your planning sessions with 
            collaborative estimation, dual voting systems, and comprehensive analytics.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'}
              className="flex items-center space-x-2"
            >
              <LogIn className="h-5 w-5" />
              <span>Sign In to Create Room</span>
            </Button>
            <GuestLoginModal>
              <Button 
                variant="outline" 
                size="lg"
                className="flex items-center space-x-2"
              >
                <User className="h-5 w-5" />
                <span>Play as Guest</span>
              </Button>
            </GuestLoginModal>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => {
                const roomId = prompt("Enter room ID to join:");
                if (roomId) window.location.href = `/room/${roomId}`;
              }}
            >
              Join Existing Room
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Real-time Collaboration</h3>
              <p className="text-slate-600">
                Vote simultaneously with your team. See results update in real-time with automatic fallback to polling.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Dual Voting System</h3>
              <p className="text-slate-600">
                Estimate both story points and time. Customize voting systems to match your team's workflow.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Comprehensive Analytics</h3>
              <p className="text-slate-600">
                Track voting history, analyze consensus patterns, and improve estimation accuracy over time.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}