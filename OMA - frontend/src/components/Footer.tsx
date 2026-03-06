import { Link } from "react-router";
import { DATA_CONTROLLER_EMAIL } from "../config/gdpr";

export function Footer() {
  return (
    <footer className="w-full border-t bg-white py-6">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-6 md:flex-row">
        <p className="text-sm text-gray-500">
          &copy; {new Date().getFullYear()} OMA. All rights reserved.
        </p>
        <div className="flex gap-4 text-sm text-gray-500">
          <Link to="/privacy-policy" className="hover:text-gray-700 transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms-of-service" className="hover:text-gray-700 transition-colors">
            Terms of Service
          </Link>
          <a href={`mailto:${DATA_CONTROLLER_EMAIL}`} className="hover:text-gray-700 transition-colors">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
