import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import BottomNavigation from "@/components/bottom-navigation";
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  MessageCircle,
  Mic,
  Phone,
  BookOpen,
  Target,
  Users,
  Settings
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Challenge } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type ScenarioType = "chat" | "voice" | "call";
type DifficultyLevel = "easy" | "medium" | "hard";

interface CustomScenario {
  id?: number;
  title: string;
  description: string;
  type: ScenarioType;
  difficulty: DifficultyLevel;
  category: string;
  clientName?: string;
  clientType?: string;
  initialMessage: string;
  expectedResponse?: string;
  tips: string[];
  isActive: boolean;
}

interface CoachingPhrase {
  id?: number;
  category: string;
  situation: string;
  poorExample: string;
  betterExample: string;
  tip: string;
  difficulty: DifficultyLevel;
}

export default function KnowledgeBase() {
  const [activeTab, setActiveTab] = useState("scenarios");
  const [isAddingScenario, setIsAddingScenario] = useState(false);
  const [isAddingPhrase, setIsAddingPhrase] = useState(false);
  const [editingScenario, setEditingScenario] = useState<CustomScenario | null>(null);
  const [editingPhrase, setEditingPhrase] = useState<CoachingPhrase | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // New scenario form state
  const [newScenario, setNewScenario] = useState<CustomScenario>({
    title: "",
    description: "",
    type: "chat",
    difficulty: "medium",
    category: "objection",
    clientName: "",
    clientType: "",
    initialMessage: "",
    expectedResponse: "",
    tips: [],
    isActive: true
  });

  // New phrase form state
  const [newPhrase, setNewPhrase] = useState<CoachingPhrase>({
    category: "objections",
    situation: "",
    poorExample: "",
    betterExample: "",
    tip: "",
    difficulty: "medium"
  });

  const { data: challenges = [] } = useQuery<Challenge[]>({
    queryKey: ["/api/challenges"],
  });

  const addScenarioMutation = useMutation({
    mutationFn: async (scenario: CustomScenario) => {
      const response = await apiRequest("POST", "/api/scenarios", scenario);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      setIsAddingScenario(false);
      setNewScenario({
        title: "",
        description: "",
        type: "chat",
        difficulty: "medium",
        category: "objection",
        clientName: "",
        clientType: "",
        initialMessage: "",
        expectedResponse: "",
        tips: [],
        isActive: true
      });
      toast({
        title: "Scenario Added",
        description: "New training scenario has been added successfully.",
      });
    },
  });

  const updateScenarioMutation = useMutation({
    mutationFn: async (scenario: CustomScenario) => {
      const response = await apiRequest("PUT", `/api/scenarios/${scenario.id}`, scenario);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      setEditingScenario(null);
      toast({
        title: "Scenario Updated",
        description: "Training scenario has been updated successfully.",
      });
    },
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/scenarios/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      toast({
        title: "Scenario Deleted",
        description: "Training scenario has been removed.",
      });
    },
  });

  const addPhraseMutation = useMutation({
    mutationFn: async (phrase: CoachingPhrase) => {
      const response = await apiRequest("POST", "/api/coaching-phrases", phrase);
      return response.json();
    },
    onSuccess: () => {
      setIsAddingPhrase(false);
      setNewPhrase({
        category: "objections",
        situation: "",
        poorExample: "",
        betterExample: "",
        tip: "",
        difficulty: "medium"
      });
      toast({
        title: "Coaching Phrase Added",
        description: "New coaching phrase has been added successfully.",
      });
    },
  });

  const handleAddTip = () => {
    if (newScenario.tips.length < 5) {
      setNewScenario({
        ...newScenario,
        tips: [...newScenario.tips, ""]
      });
    }
  };

  const handleUpdateTip = (index: number, value: string) => {
    const updatedTips = [...newScenario.tips];
    updatedTips[index] = value;
    setNewScenario({
      ...newScenario,
      tips: updatedTips
    });
  };

  const handleRemoveTip = (index: number) => {
    setNewScenario({
      ...newScenario,
      tips: newScenario.tips.filter((_, i) => i !== index)
    });
  };

  const getTypeIcon = (type: ScenarioType) => {
    switch (type) {
      case "chat": return <MessageCircle className="w-4 h-4" />;
      case "voice": return <Mic className="w-4 h-4" />;
      case "call": return <Phone className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case "easy": return "default";
      case "medium": return "secondary";
      case "hard": return "destructive";
    }
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Knowledge Base</h1>
            <p className="text-sm text-slate-500">Manage scenarios & coaching content</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            <TabsTrigger value="phrases">Coaching Phrases</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Scenarios Tab */}
          <TabsContent value="scenarios" className="px-4 mt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Training Scenarios</h2>
                <p className="text-sm text-slate-500">Manage roleplay scenarios for practice sessions</p>
              </div>
              <Dialog open={isAddingScenario} onOpenChange={setIsAddingScenario}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Scenario
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Training Scenario</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="title">Scenario Title</Label>
                        <Input
                          id="title"
                          value={newScenario.title}
                          onChange={(e) => setNewScenario({...newScenario, title: e.target.value})}
                          placeholder="e.g., Price Objection Handler"
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">Scenario Type</Label>
                        <Select value={newScenario.type} onValueChange={(value) => setNewScenario({...newScenario, type: value as ScenarioType})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="chat">Chat Practice</SelectItem>
                            <SelectItem value="voice">Voice Recording</SelectItem>
                            <SelectItem value="call">Voice Call</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="difficulty">Difficulty</Label>
                        <Select value={newScenario.difficulty} onValueChange={(value) => setNewScenario({...newScenario, difficulty: value as DifficultyLevel})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select value={newScenario.category} onValueChange={(value) => setNewScenario({...newScenario, category: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="objection">Objection Handling</SelectItem>
                            <SelectItem value="inquiry">Initial Inquiry</SelectItem>
                            <SelectItem value="negotiation">Negotiation</SelectItem>
                            <SelectItem value="follow-up">Follow-up</SelectItem>
                            <SelectItem value="closing">Closing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newScenario.description}
                        onChange={(e) => setNewScenario({...newScenario, description: e.target.value})}
                        placeholder="Brief description of the scenario"
                        rows={2}
                      />
                    </div>

                    {(newScenario.type === "call" || newScenario.type === "chat") && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="clientName">Client Name</Label>
                          <Input
                            id="clientName"
                            value={newScenario.clientName}
                            onChange={(e) => setNewScenario({...newScenario, clientName: e.target.value})}
                            placeholder="e.g., Sarah Chen"
                          />
                        </div>
                        <div>
                          <Label htmlFor="clientType">Client Type</Label>
                          <Input
                            id="clientType"
                            value={newScenario.clientType}
                            onChange={(e) => setNewScenario({...newScenario, clientType: e.target.value})}
                            placeholder="e.g., First-time Buyer"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="initialMessage">Initial Client Message</Label>
                      <Textarea
                        id="initialMessage"
                        value={newScenario.initialMessage}
                        onChange={(e) => setNewScenario({...newScenario, initialMessage: e.target.value})}
                        placeholder="What the client will say to start the conversation"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="expectedResponse">Expected Response (Optional)</Label>
                      <Textarea
                        id="expectedResponse"
                        value={newScenario.expectedResponse}
                        onChange={(e) => setNewScenario({...newScenario, expectedResponse: e.target.value})}
                        placeholder="Guidelines for ideal response"
                        rows={2}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Coaching Tips</Label>
                        <Button variant="outline" size="sm" onClick={handleAddTip}>
                          <Plus className="w-3 h-3 mr-1" />
                          Add Tip
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {newScenario.tips.map((tip, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Input
                              value={tip}
                              onChange={(e) => handleUpdateTip(index, e.target.value)}
                              placeholder={`Tip ${index + 1}`}
                            />
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveTip(index)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <Button variant="outline" onClick={() => {
                        setIsAddingScenario(false);
                        setEditingScenario(null);
                        setNewScenario({
                          title: "",
                          description: "",
                          type: "chat",
                          difficulty: "medium",
                          category: "objection",
                          clientName: "",
                          clientType: "",
                          initialMessage: "",
                          expectedResponse: "",
                          tips: [],
                          isActive: true
                        });
                      }}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => {
                          if (editingScenario) {
                            updateScenarioMutation.mutate(newScenario);
                          } else {
                            addScenarioMutation.mutate(newScenario);
                          }
                        }}
                        disabled={!newScenario.title || !newScenario.initialMessage || addScenarioMutation.isPending || updateScenarioMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {(addScenarioMutation.isPending || updateScenarioMutation.isPending) ? "Saving..." : editingScenario ? "Update Scenario" : "Save Scenario"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Scenarios List */}
            <div className="space-y-4">
              {challenges.map((challenge) => (
                <Card key={challenge.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getTypeIcon("chat")}
                          <h3 className="font-semibold text-slate-900">{challenge.title}</h3>
                          <Badge variant={getDifficultyColor(challenge.difficulty as DifficultyLevel)}>
                            {challenge.difficulty}
                          </Badge>
                          <Badge variant="outline">{challenge.category}</Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{challenge.description}</p>
                        
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-sm text-slate-700 italic">"{challenge.scenario}"</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingScenario({
                              id: challenge.id,
                              title: challenge.title,
                              description: challenge.description,
                              type: "chat",
                              difficulty: challenge.difficulty as DifficultyLevel,
                              category: challenge.category,
                              clientName: "",
                              clientType: "",
                              initialMessage: challenge.scenario,
                              expectedResponse: challenge.expectedResponse || "",
                              tips: [],
                              isActive: challenge.isActive ?? true
                            });
                            setNewScenario({
                              id: challenge.id,
                              title: challenge.title,
                              description: challenge.description,
                              type: "chat",
                              difficulty: challenge.difficulty as DifficultyLevel,
                              category: challenge.category,
                              clientName: "",
                              clientType: "",
                              initialMessage: challenge.scenario,
                              expectedResponse: challenge.expectedResponse || "",
                              tips: [],
                              isActive: challenge.isActive ?? true
                            });
                            setIsAddingScenario(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteScenarioMutation.mutate(challenge.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {challenges.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No scenarios yet</h3>
                  <p className="text-slate-600 mb-6">Create your first training scenario to get started</p>
                  <Button onClick={() => setIsAddingScenario(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Scenario
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Coaching Phrases Tab */}
          <TabsContent value="phrases" className="px-4 mt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Coaching Phrases</h2>
                <p className="text-sm text-slate-500">Manage better phrasing examples for coaching</p>
              </div>
              <Button onClick={() => setIsAddingPhrase(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Phrase
              </Button>
            </div>

            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Coaching phrases coming soon</h3>
              <p className="text-slate-600">This feature will allow you to add custom coaching phrases and examples</p>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="px-4 mt-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Content Analytics</h2>
                <p className="text-sm text-slate-500">Usage statistics for your training content</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary mb-1">{challenges.length}</div>
                    <div className="text-sm text-slate-500">Total Scenarios</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-secondary mb-1">0</div>
                    <div className="text-sm text-slate-500">Custom Phrases</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Popular Scenarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600">Usage analytics will appear here as users practice with your scenarios</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation currentPage="home" />
    </>
  );
}