import React from "react";

const About = () => {
  return (
    <div className="bg-gray-50 py-10">
      <div className="container mx-auto px-4">
        <h1 className="text-5xl font-bold text-center text-gray-800 mb-8 animate-bounce">
          About Us.
        </h1>
        <div className=" shadow-lg rounded-lg p-8 ">
          <section className="mb-8">
            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
              Our Mission
            </h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>UmmahConnect</strong> aims to bring Muslims closer
              together through technology, fostering a strong and supportive
              online community. We provide educational resources, community
              forums, and networking opportunities for Muslims worldwide.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
              Our Goals.
            </h2>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed">
              <li>
                Expand our content library with diverse and valuable resources.
              </li>
              <li>
                Enhance our community engagement tools to foster stronger
                connections.
              </li>
              <li>
                Introduce new features like live webinars and virtual study
                groups.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
              Features
            </h2>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2">
              <li>Comprehensive library of Islamic educational materials.</li>
              <li>Engaging community forums for meaningful conversations.</li>
              <li>
                Networking opportunities for professional and social
                connections.
              </li>
              <li>Regular live webinars with knowledgeable speakers.</li>
              <li>Organized virtual study groups for various topics.</li>
              <li>Enhanced tools for community engagement.</li>
              <li>User profiles to showcase skills and interests.</li>
              <li>
                Event management tools for organizing and participating in
                events.
              </li>
              <li>
                Continuous expansion of content library with diverse
                perspectives.
              </li>
              <li>
                Support and help resources for mental health, financial advice,
                and more.
              </li>
              <li>
                Opportunities for users to contribute content and resources.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
              Join Us
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We invite all Muslims to join our community and contribute to the
              growth and support of our Ummah. Together, we can create a
              positive impact and strengthen our bonds through shared knowledge
              and experiences.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default About;
