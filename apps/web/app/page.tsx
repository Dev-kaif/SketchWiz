'use client';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Button } from '@repo/ui/button';
import { useRouter } from 'next/navigation';
import { Mail, Instagram, Twitter, Github, Linkedin } from 'lucide-react'

// Define animation variants for fade-in and slide-in effects
const fadeInVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 1.5, ease: 'easeIn' } },
};

const slideInVariant = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 1, ease: 'easeOut' } },
};

export default function HomePage() {
  // FAQ items with questions and answers
  const faqItems = [
    {
      question: "What is SketchWiz?",
      answer:
        "SketchWiz is a digital sketching platform that offers an infinite canvas and collaborative tools, making it easy for creative minds to bring their ideas to life.",
    },
    {
      question: "How do collaborative features work?",
      answer:
        "Our real-time collaboration feature allows multiple users to work on the same canvas simultaneously, enabling seamless teamwork and creative exchange.",
    },
    {
      question: "How do I save my work?",
      answer:
        "Your sketches are automatically saved, and you also have the option to manually save or export your creations in multiple formats.",
    },
    {
      question: "Is there a mobile version available?",
      answer:
        "No, SketchWiz will be fully optimized for mobile devices, providing a smooth and responsive experience across all platforms.",
    },
    {
      question: "Can I export my drawings?",
      answer:
        "Currently NO but in future Yes.",
    }
  ];
  

  // State to track which FAQ items are open
  const [openFaq, setOpenFaq] = useState<{ [key: number]: boolean }>({});
  const router = useRouter();
  const[alreadyLogged,setAlreadyLogged] = useState(false)

  const toggleFaq = (index: number) => {
    setOpenFaq((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  useEffect(()=>{
    const token = localStorage.getItem("authorization")
    if(token){
      setAlreadyLogged(true)
    }
  },[])

  return (
    <>
      <Head>
        <title>SketchWiz - Unleash Your Creativity</title>
        <meta
          name="description"
          content="SketchWiz is a powerful, intuitive sketching tool designed to boost your creativity."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Main container with a dark theme using Tailwind arbitrary colors */}
      <div className="bg-[#191414] text-white min-h-screen">
        {/* Navigation Bar */}
        <motion.nav
          className="container mx-auto px-6 py-4 flex justify-between items-center"
          initial="hidden"
          animate="visible"
          variants={fadeInVariant}
        >
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold">SketchWiz</h1>
          </div>
          <ul className="hidden md:flex space-x-6">
            <li className="hover:text-[#1DB954] transition-colors duration-300">
              <a href="#hero">Home</a>
            </li>
            <li className="hover:text-[#1DB954] transition-colors duration-300">
              <a href="#features">Features</a>
            </li>
            <li className="hover:text-[#1DB954] transition-colors duration-300">
              <a href="#demo">Demo</a>
            </li>
            <li className="hover:text-[#1DB954] transition-colors duration-300">
              <a href="#testimonials">Testimonials</a>
            </li>
            <li className="hover:text-[#1DB954] transition-colors duration-300">
              <a href="#about">About</a>
            </li>
            <li className="hover:text-[#1DB954] transition-colors duration-300">
              <a href="#faq">FAQ</a>
            </li>
          </ul>
        </motion.nav>

        {/* Hero Section */}
        <motion.section
          id="hero"
          className="container mx-auto px-6 py-20 text-center my-20"
          initial="hidden"
          animate="visible"
          variants={fadeInVariant}
        >
          <h2 className="text-4xl md:text-6xl font-extrabold mb-6">
            Unleash Your Creativity with SketchWiz
          </h2>
          <p className="text-lg md:text-2xl mb-8 text-gray-300">
            Your next-level drawing and sketching tool. Simple, intuitive, and powerful.
          </p>
          <Button onClickHandler={()=>{
            if(alreadyLogged){
              router.push('/Dashboard')
              return;
            }
            router.push('/auth')
          }} className='primary' >{alreadyLogged? "Welcome Back":"Get Started"}</Button>
        </motion.section>

        {/* Features Overview */}
        <motion.section
          id="features"
          className="container mx-auto px-6 py-16"
          initial="hidden"
          animate="visible"
          variants={slideInVariant}
        >
          <h3 className="text-3xl font-bold text-center mb-10">Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-[#333333] rounded-lg hover:shadow-xl transition-shadow duration-300">
              <h4 className="text-xl font-semibold mb-2">Infinite Canvas</h4>
              <p className="text-gray-400">
                Experience limitless creativity with an endless workspace that adapts to your vision.
              </p>
            </div>
            <div className="p-6 bg-[#333333] rounded-lg hover:shadow-xl transition-shadow duration-300">
              <h4 className="text-xl font-semibold mb-2">Collaborative Tools</h4>
              <p className="text-gray-400">
                Work in real-time with friends or colleagues to create together.
              </p>
            </div>
            <div className="p-6 bg-[#333333] rounded-lg hover:shadow-xl transition-shadow duration-300">
              <h4 className="text-xl font-semibold mb-2">Powerful Editing</h4>
              <p className="text-gray-400">
                Advanced features that provide both precision and flexibility in your designs.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Screenshots / Demo Section */}
        <motion.section
          id="demo"
          className="container mx-auto px-6 py-16"
          initial="hidden"
          animate="visible"
          variants={fadeInVariant}
        >
          <h3 className="text-3xl font-bold text-center mb-10">See SketchWiz in Action</h3>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="relative w-full md:w-1/3 h-64">
              <Image
                src="/maths.png"
                alt="SketchWiz Demo 1"
                fill
                unoptimized
                className="rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 object-cover"
              />
            </div>
            <div className="relative w-full md:w-1/3 h-64">
              <Image
                src="/image.png"
                alt="SketchWiz Demo 2"
                fill
                unoptimized
                className="rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 object-cover"
              />
            </div>
            <div className="relative w-full md:w-1/3 h-64">
              <Image
                src="/real.png"
                alt="SketchWiz Demo 3"
                fill
                unoptimized
                className="rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 object-cover"
              />
            </div>
          </div>
        </motion.section>

        {/* Testimonials / Feedback Section */}
        <motion.section
          id="testimonials"
          className="container mx-auto px-6 py-16"
          initial="hidden"
          animate="visible"
          variants={slideInVariant}
        >
          <h3 className="text-3xl font-bold text-center mb-10">What Our Users Say</h3>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="bg-[#333333] p-6 rounded-lg shadow-md flex-1">
              <p className="italic text-gray-400">
                "SketchWiz has completely transformed the way I create digital art. Highly recommended!"
              </p>
              <p className="mt-4 font-bold">– Alex D.</p>
            </div>
            <div className="bg-[#333333] p-6 rounded-lg shadow-md flex-1">
              <p className="italic text-gray-400">
                "The collaborative features are a game-changer. It's like having a digital studio at my fingertips."
              </p>
              <p className="mt-4 font-bold">– Jamie L.</p>
            </div>
            <div className="bg-[#333333] p-6 rounded-lg shadow-md flex-1">
              <p className="italic text-gray-400">
                "Intuitive, powerful, and fun to use. SketchWiz is my go-to app for quick sketches."
              </p>
              <p className="mt-4 font-bold">– Morgan S.</p>
            </div>
          </div>
        </motion.section>

        {/* About Section */}
        <motion.section
          id="about"
          className="container mx-auto px-6 py-16"
          initial="hidden"
          animate="visible"
          variants={fadeInVariant}
        >
          <h3 className="text-3xl font-bold text-center mb-10">About SketchWiz</h3>
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-lg text-gray-300 mb-4">
              SketchWiz is the ultimate digital sketching platform designed for artists, designers, and creative enthusiasts. Our innovative approach combines an infinite canvas with powerful editing tools and real-time collaboration, ensuring that your creative process is as fluid and boundless as your imagination.
            </p>
            <p className="text-lg text-gray-300">
              Whether you're a seasoned professional or just beginning your creative journey, SketchWiz offers an intuitive and flexible workspace that adapts to your needs.
            </p>
          </div>
        </motion.section>

        {/* FAQ Section with Accordion */}
        <motion.section
          id="faq"
          className="container mx-auto px-6 py-16"
          initial="hidden"
          animate="visible"
          variants={slideInVariant}
        >
          <h3 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h3>
          <div className="max-w-4xl mx-auto space-y-4">
            {faqItems.map((item, index) => (
              <div key={index} className="border border-gray-700 rounded-md">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full text-left px-4 py-3 focus:outline-none flex justify-between items-center"
                >
                  <span className="text-lg font-medium">{item.question}</span>
                  <span>{openFaq[index] ? '-' : '+'}</span>
                </button>
                {openFaq[index] && (
                  <div className="px-4 py-3 border-t border-gray-700">
                    <p className="text-gray-400">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="bg-[#121212] text-white py-12">
          <div className=" px-6 md:flex justify-between items-center ">
            {/* Company Info */}
            <div>
              <h2 className="text-9xl font-bold mb-4">SketchWiz</h2>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
              <ul>
                <li className="mb-2">
                  <a href="#hero" className="hover:text-[#1DB954] transition-colors duration-300">
                    Home
                  </a>
                </li>
                <li className="mb-2">
                  <a href="#features" className="hover:text-[#1DB954] transition-colors duration-300">
                    Features
                  </a>
                </li>
                <li className="mb-2">
                  <a href="#about" className="hover:text-[#1DB954] transition-colors duration-300">
                    About
                  </a>
                </li>
                <li className="mb-2">
                  <a href="#faq" className="hover:text-[#1DB954] transition-colors duration-300">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Social & Contact */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Connect With Us</h3>
              <div className="flex space-x-4">
                <a
                  href="mailto:contact@sketchwiz.com"
                  className="hover:text-[#1DB954] transition-colors duration-300"
                >
                  <Mail size={24} />
                </a>
                <a
                  href="https://instagram.com/sketchwiz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#1DB954] transition-colors duration-300"
                >
                  <Instagram size={24} />
                </a>
                <a
                  href="https://twitter.com/sketchwiz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#1DB954] transition-colors duration-300"
                >
                  <Twitter size={24} />
                </a>
                <a
                  href="https://github.com/sketchwiz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#1DB954] transition-colors duration-300"
                >
                  <Github size={24} />
                </a>
                <a
                  href="https://linkedin.com/company/sketchwiz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#1DB954] transition-colors duration-300"
                >
                  <Linkedin size={24} />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="container mx-auto px-6 mt-8 text-center">
            <p className="text-gray-500">
              &copy; {new Date().getFullYear()} SketchWiz. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
