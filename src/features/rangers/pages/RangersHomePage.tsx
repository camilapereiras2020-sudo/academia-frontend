import RangersHeader from "../components/RangersHeader"
import RangersHero from "../components/RangersHero"
import RangersStrip from "../components/RangersStrip"
import RangersPrograms from "../components/RangersPrograms"
import RangersTrail from "../components/RangersTrail"
import RangersFieldReports from "../components/RangersFieldReports"
import RangersBio from "../components/RangersBio"
import RangersFooter from "../components/RangersFooter"

/**
 * Public marketing homepage for Rangers Academy.
 * Not behind auth — mounted directly in App.tsx, outside ProtectedRoute.
 */
export default function RangersHomePage() {
  return (
    <div className="font-sans">
      <RangersHeader />
      <RangersHero />
      <RangersStrip />
      <RangersPrograms />
      <RangersTrail />
      <RangersFieldReports />
      <RangersBio />
      <RangersFooter />
    </div>
  )
}
