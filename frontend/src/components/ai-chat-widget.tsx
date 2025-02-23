"use client"

import { useState, useRef, useEffect } from "react"
import { Maximize2, Minimize2, X, Send, Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Message {
  type: "query" | "response"
  text: string
  isTyping?: boolean
}

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [query, setQuery] = useState("")
  const [responses, setResponses] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [responses, isTyping])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isTyping) return

    // Add user query to responses
    setResponses(prev => [...prev, { type: "query", text: query }])
    setIsTyping(true)

    // Simulate AI response
    const aiResponse = `I understand you're asking about "${query}". Here's what I can tell you:

1. Based on my analysis of the patient's records:
   • Recent therapy sessions show positive progress
   • Exercise compliance is trending upward
   • Pain levels are gradually decreasing

2. Recommended next steps:
   • Continue with the current exercise regimen
   • Schedule a follow-up assessment
   • Monitor range of motion improvements

Would you like me to provide more specific details about any of these points?`

    // Add AI response after a delay to simulate typing
    setTimeout(() => {
      setResponses(prev => [...prev, { type: "response", text: aiResponse }])
      setIsTyping(false)
    }, 1500)

    setQuery("")
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
        {responses.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-muted-foreground p-4">
            <IrisLogo />
            <div>
              <p className="text-lg font-medium mb-2">Hello, I&apos;m Iris!</p>
              <p className="text-sm">I&apos;m here to help with patient assessments, treatment plans, and clinical recommendations.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
              <Button variant="outline" onClick={() => setQuery("Can you analyze the latest patient assessment?")}>
                Patient Assessment
              </Button>
              <Button variant="outline" onClick={() => setQuery("What are the recommended exercises for this patient?")}>
                Treatment Recommendations
              </Button>
              <Button variant="outline" onClick={() => setQuery("Show me the progress metrics")}>
                Progress Analysis
              </Button>
            </div>
          </div>
        ) : (
          <>
            {responses.map((response, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-2",
                  response.type === "query" ? "justify-end" : "justify-start"
                )}
              >
                {response.type === "response" && <IrisLogo />}
                <div
                  className={cn(
                    "rounded-lg p-3 max-w-[80%]",
                    response.type === "query"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100"
                  )}
                >
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {response.text}
                  </pre>
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
          placeholder="Ask Iris a question..."
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={isTyping} className="bg-blue-600 hover:bg-blue-700">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  )
}
