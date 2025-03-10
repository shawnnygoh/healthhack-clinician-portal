"use client"

import { useState, useRef, useEffect } from "react"
import { Maximize2, Minimize2, X, Send, Stethoscope, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import ReactMarkdown from 'react-markdown'
import { useUserContext } from '@/context/UserContext'
import remarkGfm from 'remark-gfm';

interface PatientInfo {
  id: string
  name: string
}

interface RawData {
  patient_info?: PatientInfo
  [key: string]: unknown
}

interface Message {
  type: "query" | "response"
  text: string
  isTyping?: boolean
  raw_data?: RawData
}

export function AIChatWidget() {
  const { userData: user } = useUserContext();
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [currentPatient, setCurrentPatient] = useState<number | null>(null)
  const [patientName, setPatientName] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const formatResponseText = (text: string) => {
    const cleanedText = text.replace(/\n{3,}/g, '\n\n');
    
    const withMarkdownBullets = cleanedText.replace(/^•\s+(.+)$/gm, '* $1');
    
    return withMarkdownBullets;
  };

  const getFirstName = (fullName: string | undefined) => {
    if (!fullName) return 'Clinician';
    
    // Define common titles to filter out
    const titles = ['dr', 'dr.', 'prof', 'prof.', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'miss'];
    
    // Split the name and convert to lowercase for comparison
    const nameParts = fullName.split(' ');
    
    // If the first part is a title, return the second part
    if (nameParts.length > 1 && titles.includes(nameParts[0].toLowerCase())) {
      return nameParts[1];
    }
    
    // Otherwise return the first part as before
    return nameParts[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isTyping) return

    // Add user query to messages
    setMessages(prev => [...prev, { type: "query", text: query }])
    setIsTyping(true)

    try {
      // Send query to backend with CORS headers
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors', // Explicitly set CORS mode
        body: JSON.stringify({ 
          query, 
          patient_id: currentPatient 
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      
      // Format the response text for better display
      const formattedResponse = formatResponseText(data.response);
      
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          type: "response", 
          text: formattedResponse,
          raw_data: data.supporting_evidence 
        }]);
        setIsTyping(false);
      }, 600);
    } catch (error) {
      console.error("Error querying AI assistant:", error);
      
      setMessages(prev => [...prev, { 
        type: "response", 
        text: `I'm sorry, I encountered an error connecting to the server. Please check if the backend is running on port 5011 and try again. Error: ${error instanceof Error ? error.message : String(error)}`
      }]);
      setIsTyping(false);
    }

    setQuery("")
  };

  // Function to set the current patient context
  const setPatientContext = (patientId: number, name: string) => {
    setCurrentPatient(patientId);
    setPatientName(name);
    setMessages(prev => [...prev, { 
      type: "response", 
      text: `I'm now focused on patient ${name}. How can I help with their rehabilitation plan?`
    }]);
  }

  // Function to clear the current patient context
  const clearPatientContext = () => {
    setCurrentPatient(null);
    setPatientName(null);
    setMessages(prev => [...prev, { 
      type: "response", 
      text: "I'm no longer focused on a specific patient. You can ask general questions about rehabilitation exercises and treatment approaches."
    }]);
  }

  const IrisLogo = () => (
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600">
      <Stethoscope className="h-5 w-5" />
    </div>
  )

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg p-0 flex items-center justify-center hover:scale-105 transition-transform bg-blue-600 hover:bg-blue-700"
        onClick={() => setIsOpen(true)}
      >
        <IrisLogo />
      </Button>
    )
  }

  return (
    <Card
      className={cn(
        "fixed right-4 bottom-4 shadow-lg transition-all duration-200 ease-in-out overflow-hidden flex flex-col",
        isExpanded ? "h-[80vh] w-[80vw] max-w-4xl" : "h-[500px] w-[380px]"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b shrink-0">
        <CardTitle className="flex items-center gap-3">
          <IrisLogo />
          <div className="flex flex-col">
            <span className="text-lg">Iris</span>
            <span className="text-xs text-muted-foreground">Your AI clinical assistant</span>
          </div>
        </CardTitle>
        <div className="flex gap-1">
          {currentPatient && (
            <Badge variant="outline" className="mr-2 px-2 py-1 bg-blue-50">
              Patient: {patientName}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 ml-1 p-0"
                onClick={clearPatientContext}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-muted-foreground p-4">
            <IrisLogo />
            <div>
              <p className="text-lg font-medium mb-2">Hello, {getFirstName(user?.name)}!</p>
              <p className="text-sm">I&apos;m Iris, your AI assistant. I can help analyze patient data, suggest exercises, and provide evidence-based recommendations for rehabilitation.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
              <Button variant="outline" onClick={() => setQuery("What exercises are recommended for Parkinson's patients with hand tremors?")}>
                Exercise Recommendations
              </Button>
              <Button variant="outline" onClick={() => setQuery("What are the latest guidelines for physical therapy in rheumatoid arthritis?")}>
                Clinical Guidelines
              </Button>
              <Button variant="outline" onClick={() => setQuery("How can I track progress for patients with movement disorders?")}>
                Progress Assessment
              </Button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-2",
                  message.type === "query" ? "justify-end" : "justify-start"
                )}
              >
                {message.type === "response" && <IrisLogo />}
                {message.type === "query" && <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center"><User className="h-5 w-5 text-white" /></div>}
                <div
                  className={cn(
                    "rounded-lg p-3 max-w-[80%]",
                    message.type === "query"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100"
                  )}
                >
                  {message.type === "response" ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap font-sans text-sm">
                      {message.text}
                    </p>
                  )}
                  
                  {/* If the message contains patient data suggestions */}
                  {message.raw_data?.patient_info && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => setPatientContext(
                          parseInt(message.raw_data?.patient_info?.id ?? "0"), 
                          message.raw_data?.patient_info?.name ?? "Unknown Patient"
                        )}
                      >
                        Focus on this patient
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2">
                <IrisLogo />
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex gap-1">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>●</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2 shrink-0">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={currentPatient 
            ? `Ask about ${patientName}'s rehabilitation...` 
            : "Ask about exercises, treatments, guidelines..."
          }
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={isTyping} className="bg-blue-600 hover:bg-blue-700">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  )
}
