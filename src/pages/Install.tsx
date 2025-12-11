import { useState, useEffect } from "react";
import { Download, Smartphone, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-card/95 backdrop-blur">
        <CardHeader className="text-center">
          <img 
            src="/icons/jamont-logo.png" 
            alt="Jamont Technologies" 
            className="w-48 h-auto mx-auto mb-4"
          />
          <CardTitle>Install Jamont</CardTitle>
          <CardDescription>
            Install Jamont on your device for quick access and offline learning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isInstalled ? (
            <div className="text-center space-y-2">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
              <p className="font-medium">Jamont is installed!</p>
              <p className="text-sm text-muted-foreground">
                You can now access it from your home screen
              </p>
            </div>
          ) : deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="w-5 h-5 mr-2" />
              Install App
            </Button>
          ) : (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">To install Jamont:</p>
              <div className="space-y-2">
                <p><strong>iOS Safari:</strong> Tap Share → Add to Home Screen</p>
                <p><strong>Android Chrome:</strong> Tap Menu → Install App</p>
                <p><strong>Desktop:</strong> Look for install icon in address bar</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
