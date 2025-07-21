"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icons
import {
  BrainCircuit,
  Users,
  Paintbrush,
  Twitter,
  Github,
  Linkedin,
  ChevronRight,
  Plus,
  Minus,
} from "lucide-react";

// MAIN LANDING PAGE COMPONENT
export default function CleanSaaS_LandingPage() {
  return (
    <main className="min-h-screen bg-[#111111] text-[#E8E8E8] font-sans">
      <Navbar />
      <div className="pt-16">
        {" "}
        {/* Adjusted padding to match navbar height */}
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
        <AboutSection />
        <FaqSection />
        <FinalCTA />
      </div>
      <Footer />
    </main>
  );
}

const Navbar = () => {
  const [isLogged, setIsLogged] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("authorization");
    if (token) {
      setIsLogged(true);
    }
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-[#111111]/80 border-b border-[#333333]">
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex justify-between items-center max-w-7xl mx-auto px-6 h-16"
      >
        <Link href="/" className="font-bold text-xl text-white">
          SketchWiz
        </Link>
        <div className="hidden md:flex gap-2 items-center">
          {["About", "Features", "FAQ"].map((item) => (
            <Link key={item} href={`#${item}`}>
              <Button
                variant="ghost"
                className="text-[#E8E8E8] hover:bg-[#1C1C1C] hover:text-white"
              >
                {item}
              </Button>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push("/auth?login=true")}
            size="default"
            variant="ghost"
            className="text-[#E8E8E8] hover:bg-[#1C1C1C] hover:text-white text-sm"
          >
            Sign In
          </Button>
          <Button
            onClick={() => {
              if (isLogged) {
                router.push("/Dashboard");
              } else {
                router.push("/auth");
              }
            }}
            className="bg-[#00A3FF] text-white text-sm font-semibold hover:bg-[#00A3FF]/90 rounded-md"
          >
            Get Started
          </Button>
        </div>
      </motion.div>
    </header>
  );
};

const sectionAnimation = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
  viewport: { once: true, amount: 0.3 },
};

const HeroSection = () => {
  const [isLogged, setIsLogged] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("authorization");
    if (token) {
      setIsLogged(true);
    }
  }, []);

  return (
    <section className="py-32 md:py-48 flex flex-col items-center justify-center text-center">
      <motion.div {...sectionAnimation} className="relative z-10 px-6">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">
          From Complex Sketch
          <br />
          to Clear Solution, Instantly.
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-[#b4b4b4]">
          SketchWiz is an AI-powered collaborative canvas that understands your
          ideas, solves problems, and enhances your creativity in real-time.
        </p>
        <div className="mt-8 flex justify-center items-center gap-4">
          <Button
            onClick={() => {
              if (isLogged) {
                router.push("/Dashboard");
              } else {
                router.push("/auth");
              }
            }}
            size="default"
            className="bg-[#00A3FF] text-white font-semibold hover:bg-[#00A3FF]/90 rounded-md shadow-lg shadow-[#00A3FF]/20"
          >
            {isLogged ? "Continue to Dashboard" : "Get Started For Free"}
          </Button>
          <Link href={"https://www.youtube.com/watch?v=UU-s-GS0FT8"}>
          <Button
            size="default"
            variant="outline"
            className="text-white border-[#333333] bg-transparent hover:bg-[#1C1C1C] hover:text-white rounded-md flex gap-2"
          >
            <ChevronRight className="w-4 h-4 mr-2" />
            Watch Demo
          </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
};

const AboutSection = () => {
  return (
    <section
      id="About"
      className="py-24 px-6 bg-[#1C1C1C] border-y border-[#333333]"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <motion.div {...sectionAnimation}>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Our Mission: To merge creativity with intelligence.
          </h2>
          <p className="mt-6 text-lg text-[#b4b4b4]">
            SketchWiz started with a simple idea: what if a whiteboard could do
            more than just display ideas? What if it could understand them,
            solve them, and beautify them?
          </p>
          <p className="mt-4 text-lg text-[#b4b4b4]">
            We are a small team of developers and designers passionate about
            building tools that augment human creativity. We believe AI should
            be an intuitive partner in the creative process, accessible to
            everyone from students to professional artists and engineers.
          </p>
        </motion.div>
        <motion.div
          {...sectionAnimation}
          variants={{
            ...sectionAnimation,
            transition: { ...sectionAnimation.transition },
          }}
        >
          <div className="rounded-2xl border border-[#333333] p-2">
            <Image
              height={100}
              width={100}
              src="/real.png"
              alt="A collaborative session in SketchWiz"
              className="w-full h-auto rounded-lg"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

//--- FEATURES SECTION ---//
const features = [
  {
    icon: <BrainCircuit className="w-6 h-6 text-[#00A3FF]" />,
    title: "AI Problem Solving",
    description:
      "Draw any math or physics problem and let our Gemini-powered AI find the solution instantly.",
  },
  {
    icon: <Users className="w-6 h-6 text-[#00A3FF]" />,
    title: "Real-Time Collaboration",
    description:
      "Work together on an infinite canvas. See every stroke, sketch, and solution as it happens.",
  },
  {
    icon: <Paintbrush className="w-6 h-6 text-[#00A3FF]" />,
    title: "Intelligent Sketch Enhancement",
    description:
      "Transform your rough ideas into polished art. Our AI improves your sketches with a single click.",
  },
];

const FeaturesSection = () => {
  return (
    <section
      id="Features"
      className="py-24 px-6 bg-[#1C1C1C] border-y border-[#333333]"
    >
      <motion.div
        {...sectionAnimation}
        className="text-center max-w-3xl mx-auto"
      >
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          An Intelligent Canvas Built for Clarity
        </h2>
        <p className="mt-4 text-lg text-[#b4b4b4]">
          Everything you need to create, collaborate, and innovate, all in one
          place.
        </p>
      </motion.div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {features.map((feature) => (
          <motion.div key={feature.title} variants={sectionAnimation}>
            <Card className="h-full bg-transparent border-none shadow-none">
              <CardHeader className="flex flex-col items-start gap-4">
                <div className="p-3 bg-[#00A3FF]/10 rounded-lg">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl text-white">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[#b4b4b4]">{feature.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

//--- TESTIMONIALS SECTION ---//
const testimonials = [
  {
    quote:
      "SketchWiz has revolutionized how our team brainstorms. The AI features are mind-blowing and save us hours of work.",
    name: "Alex Johnson",
    title: "Product Lead, Innovate Inc.",
  },
  {
    quote:
      "As an artist, the sketch enhancement feature is a game-changer. It takes my digital art to the next level with zero effort.",
    name: "Samantha Lee",
    title: "Digital Artist",
  },
];

const TestimonialsSection = () => (
  <section className="py-24 px-6">
    <motion.div {...sectionAnimation} className="text-center max-w-3xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
        Trusted by Creators and Innovators
      </h2>
    </motion.div>
    <div className="mt-16 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
      {testimonials.map((testimonial, index) => (
        <motion.div key={index} variants={sectionAnimation}>
          <Card className="h-full bg-[#1C1C1C] border-[#333333]">
            <CardContent className="pt-8">
              <p className="text-lg text-[#E8E8E8]">
                &ldquo;{testimonial.quote}&ldquo;
              </p>
              <div className="mt-6">
                <p className="font-semibold text-white">{testimonial.name}</p>
                <p className="text-sm text-[#b4b4b4]">{testimonial.title}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  </section>
);

//--- FAQ SECTION ---//
const faqs = [
  {
    question: "What is SketchWiz?",
    answer:
      "SketchWiz is a real-time collaborative digital canvas powered by Google's Gemini AI. It's designed to help users solve complex problems, enhance their art, and work together seamlessly.",
  },
  {
    question: "How does the real-time collaboration work?",
    answer:
      "Users can create or join rooms. Any drawing or action is instantly visible to all other users in the same room via a secure WebSocket connection.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes, data security is our top priority. All data is transmitted over secure channels and we employ modern authentication and authorization practices to protect your work.",
  },
  {
    question: "Can I use this for commercial purposes?",
    answer:
      "Yes, our Pro plan is designed for commercial use and includes advanced features, unlimited storage, and priority support for professional teams and individuals.",
  },
];

const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const answerVariants = {
    hidden: { opacity: 0, height: 0, y: -10 },
    visible: { opacity: 1, height: "auto", y: 0 },
    exit: { opacity: 0, height: 0, y: -10 },
  };

  return (
    <section id="FAQ" className="py-24 px-6">
      <motion.div {...sectionAnimation} className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-[#b4b4b4]">
            Your questions, answered.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="overflow-hidden border-b border-[#333333]"
            >
              <motion.button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex justify-between items-center text-left py-5"
                whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-lg font-medium text-white">
                  {faq.question}
                </span>
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={openIndex === index ? "minus" : "plus"}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {openIndex === index ? (
                      <Minus className="w-5 h-5 text-[#00A3FF]" />
                    ) : (
                      <Plus className="w-5 h-5 text-[#b4b4b4]" />
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    variants={answerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="px-1"
                  >
                    <p className="pb-5 text-base text-[#b4b4b4]">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

const FinalCTA = () => (
  <section className="py-24 px-6">
    <motion.div
      {...sectionAnimation}
      className="max-w-3xl mx-auto text-center bg-[#1C1C1C] border border-[#333333] rounded-2xl p-8 md:p-12"
    >
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
        Ready to Transform Your Ideas?
      </h2>
      <p className="mt-4 max-w-xl mx-auto text-lg text-[#b4b4b4]">
        Join thousands of users and bring your sketches to life. Get started for
        free, no credit card required.
      </p>
      <div className="mt-8">
        <Button
          size="default"
          className="bg-[#00A3FF] text-white font-semibold hover:bg-[#00A3FF]/90 rounded-md shadow-lg shadow-[#00A3FF]/20"
        >
          Sign Up Now
        </Button>
      </div>
    </motion.div>
  </section>
);

//--- FOOTER ---//
const Footer = () => (
  <footer className="bg-[#1C1C1C] py-12 px-6 border-t border-[#333333]">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
      <div className="col-span-1 md:col-span-2">
        <h3 className="text-xl font-bold text-white">SketchWiz</h3>
        <p className="mt-2 text-sm text-[#b4b4b4]">
          The intelligent canvas for modern teams.
        </p>
      </div>
      <div>
        <h4 className="font-semibold text-white">Product</h4>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <Link
              href="#"
              className="text-[#b4b4b4] hover:text-white transition-colors"
            >
              Features
            </Link>
          </li>
          <li>
            <Link
              href="#"
              className="text-[#b4b4b4] hover:text-white transition-colors"
            >
              Pricing
            </Link>
          </li>
          <li>
            <Link
              href="#"
              className="text-[#b4b4b4] hover:text-white transition-colors"
            >
              Collaboration
            </Link>
          </li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold text-white">Follow Us</h4>
        <div className="mt-4 flex space-x-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="#"
                  className="text-[#b4b4b4] hover:text-white transition-colors"
                >
                  <Twitter size={20} />
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Twitter</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="#"
                  className="text-[#b4b4b4] hover:text-white transition-colors"
                >
                  <Github size={20} />
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>GitHub</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="#"
                  className="text-[#b4b4b4] hover:text-white transition-colors"
                >
                  <Linkedin size={20} />
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>LinkedIn</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
    <div className="mt-12 pt-8 border-t border-[#333333] text-center text-sm text-[#b4b4b4]">
      <p>&copy; {new Date().getFullYear()} SketchWiz. All rights reserved.</p>
    </div>
  </footer>
);
