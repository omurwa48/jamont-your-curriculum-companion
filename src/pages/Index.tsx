import { BookOpen, MessageSquare, NotebookPen, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Upload,
      title: "Upload Curriculum",
      description: "Add your textbooks and study materials",
      action: () => navigate("/curriculum"),
      color: "bg-primary",
    },
    {
      icon: MessageSquare,
      title: "Ask Jamont",
      description: "Get answers from your uploaded materials",
      action: () => navigate("/chat"),
      color: "bg-secondary",
    },
    {
      icon: NotebookPen,
      title: "My Notebook",
      description: "Review summaries and saved explanations",
      action: () => navigate("/notebook"),
      color: "bg-accent",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-warm-gradient opacity-10" />
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <BookOpen className="w-4 h-4" />
              Your Curriculum-Aware AI Tutor
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Meet{" "}
              <span className="bg-warm-gradient bg-clip-text text-transparent">
                Jamont
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              An AI tutor that learns from your textbooks and helps you master every concept 
              with warmth, patience, and step-by-step clarity.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                className="text-lg shadow-glow"
                onClick={() => navigate("/chat")}
              >
                Start Learning
                <MessageSquare className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/curriculum")}
              >
                Upload Curriculum
                <Upload className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-6 hover:shadow-card transition-all duration-300 cursor-pointer border-2"
              onClick={feature.action}
            >
              <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How Jamont Works</h2>
          <div className="space-y-8">
            {[
              {
                step: "1",
                title: "Upload Your Materials",
                description: "Add your textbooks, notes, and curriculum documents in PDF or DOCX format."
              },
              {
                step: "2",
                title: "Ask Questions",
                description: "Chat with Jamont about anything from your uploaded materials. She only uses what you've provided."
              },
              {
                step: "3",
                title: "Master Concepts",
                description: "Get clear explanations, examples, and practice questions to ensure you truly understand."
              },
            ].map((item, index) => (
              <div key={index} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="p-12 text-center bg-warm-gradient text-white border-0 shadow-glow">
          <h2 className="text-3xl font-bold mb-4">Ready to Learn Smarter?</h2>
          <p className="text-lg mb-6 text-white/90">
            Start your journey with Jamont today
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => navigate("/chat")}
            className="shadow-lg"
          >
            Get Started Now
          </Button>
        </Card>
      </section>
    </div>
  );
};

export default Index;
