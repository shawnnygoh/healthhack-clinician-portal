import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const faqItems = [
  {
    question: "How do I add a new patient?",
    answer:
      "To add a new patient, go to the Patients page and click on the 'Add Patient' button. Fill in the required information such as name, date of birth, contact details, and medical history. Once you've entered all the necessary information, click 'Save' to add the patient to your system.",
  },
  {
    question: "How can I view a patient's exercise history?",
    answer:
      "On the Patients page, click on a patient's name to view their profile. In the profile, you'll find a tab or section for 'Exercise History'. This section will show a chronological list of exercises performed, including dates, types of exercises, and performance metrics. You can filter this history by date range or exercise type for more specific information.",
  },
  {
    question: "How do I generate a progress report for a patient?",
    answer:
      "You can use the AI Agent on the Dashboard to generate a progress report. Simply ask a question like 'Generate a progress report for [Patient Name]' and the AI will provide a summary based on the patient's data. Alternatively, you can go to the patient's profile, click on the 'Reports' section, and select 'Generate Progress Report'. You can customize the date range and specific metrics to include in the report.",
  },
  {
    question: "How can I adjust the difficulty of exercises for a patient?",
    answer:
      "In the patient's profile, look for an 'Exercise Settings' or 'Treatment Plan' section. Here, you can adjust the difficulty levels for different exercises based on the patient's progress and needs. Click on the specific exercise you want to modify, and you'll see options to increase or decrease difficulty. Remember to save your changes and discuss these adjustments with the patient during their next session.",
  },
  {
    question: "How do I schedule a follow-up appointment?",
    answer:
      "To schedule a follow-up appointment, go to the Appointments page and click on 'Schedule New Appointment'. Select the patient from the dropdown menu, choose an available date and time slot, and specify the appointment type as 'Follow-up'. Add any necessary notes or preparation instructions for the patient, then click 'Confirm Appointment' to save it to the schedule.",
  },
  {
    question: "Can I integrate data from wearable devices?",
    answer:
      "Yes, our system supports integration with various wearable devices. Go to the Settings page and look for the 'Integrations' section. Here you'll find a list of supported devices. Click on the device you want to integrate, and follow the prompts to connect it to your patient's profile. Once connected, data from the wearable will automatically sync and be available in the patient's exercise and progress reports.",
  },
  {
    question: "How do I customize the dashboard?",
    answer:
      "To customize your dashboard, click on the 'Customize' button in the top right corner of the Dashboard page. This will open a menu where you can drag and drop different widgets, change the layout, and select which metrics you want to see at a glance. You can also set up multiple dashboard views for different purposes, such as a quick overview, detailed patient monitoring, or appointment management.",
  },
]

export default function HelpPage() {
  return (
    <div className="min-h-screen space-y-6">
      <h1 className="text-3xl font-semibold text-gray-800">Help Center</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 min-h-[800px]">
          <CardHeader>
            <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger className="text-lg">{item.question}</AccordionTrigger>
                  <AccordionContent className="text-base">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Contact Support</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base">
                    Name
                  </Label>
                  <Input id="name" placeholder="Your Name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base">
                    Email
                  </Label>
                  <Input id="email" type="email" placeholder="your@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-base">
                    Message
                  </Label>
                  <Textarea id="message" placeholder="How can we help you?" />
                </div>
                <Button type="submit">Send Message</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Quick Links</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-blue-500 hover:underline">
                    User Manual
                  </a>
                </li>
                <li>
                  <a href="#" className="text-blue-500 hover:underline">
                    Video Tutorials
                  </a>
                </li>
                <li>
                  <a href="#" className="text-blue-500 hover:underline">
                    API Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="text-blue-500 hover:underline">
                    Release Notes
                  </a>
                </li>
                <li>
                  <a href="#" className="text-blue-500 hover:underline">
                    Community Forum
                  </a>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}