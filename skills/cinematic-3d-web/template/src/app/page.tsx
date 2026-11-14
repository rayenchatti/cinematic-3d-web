import HeroSection from '@/components/HeroSection'
import AboutSection from '@/components/AboutSection'
import ExperienceSection from '@/components/ExperienceSection'
import ServicesSection from '@/components/ServicesSection'
import ProjectsSection from '@/components/ProjectsSection'
import dynamic from 'next/dynamic'
import ContactSection from '@/components/ContactSection'
import { achievements, experience, projects } from '@/content'

// Only downloaded when there are achievements to show
const AchievementsSection = dynamic(() => import('@/components/AchievementsSection'))

export default function Home() {
  return (
    <main className="min-h-dvh w-full bg-transparent">
      <HeroSection />
      <AboutSection />
      {experience.items.length > 0 && <ExperienceSection />}
      <ServicesSection />
      {projects.items.length > 0 && <ProjectsSection />}
      {achievements.items.length > 0 && <AchievementsSection />}
      <ContactSection />
    </main>
  )
}
