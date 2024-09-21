import React, { useEffect, useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import useRedirectLoggedOutUser from "../UseRedirect/UseRedirectLoggedOutUser";
import { getUser } from "../../redux/feature/auth/authSlice";
import { useDispatch, useSelector } from "react-redux";
import { MdEventNote, MdOutlineCreateNewFolder } from "react-icons/md";
import { AdminLink } from "../Protect/HiddenLink";
import PageLoader from "../Loader/PageLoader";
const URL = import.meta.env.VITE_APP_BACKEND_URL;

const EventList = ({ userId }) => {
  useRedirectLoggedOutUser("/login");
  const dispatch = useDispatch();

  const [events, setEvents] = useState([]);
  const [trending, setTrending] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const initialState = {
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    photo: user?.photo || "",
    role: user?.role || "",
  };

  const [profile, setProfile] = useState(initialState);

  useEffect(() => {
    dispatch(getUser(userId));
  }, [dispatch]);

  useLayoutEffect(() => {
    if (user) {
      setProfile({
        ...profile,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        photo: user.photo,
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true)
      const response = await fetch(`${URL}/events/upcoming`);
      const data = await response.json();
      setEvents(data)
      setLoading(false);
    };
    const fetchTrendingEvents = async () => {
      setLoading(true)
      const response = await fetch(`${URL}/events/trending-events`);
      const data = await response.json();
      // console.log(data);
      setTrending(data);
      setLoading(false)
    };
    const fetchPastEvents = async () => {
      setLoading(true)
      const response = await fetch(`${URL}/events/past`);
      const data = await response.json();
      // console.log(data);
      setPast(data);
      setLoading(false)
    };

    fetchEvents();
    fetchTrendingEvents();
    fetchPastEvents();
  }, []);

  const handleRSVP = async (eventId) => {
    try {
      const response = await fetch(`${URL}/events/${eventId}/rsvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        alert("RSVP successful!");
      } else {
        alert("Failed to RSVP. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again.");
    }
  };
if(loading){
  return (
    <div className="flex justify-center items-center min-h-screen">
      <PageLoader />
    </div>
  );
}
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        profile={profile}
        user={user}
      />

      <div
        className={`w-full bg-white p-4 flex justify-center ${
          isSidebarOpen ? "md:ml-1/4" : ""
        }`}
      >
        <div className="flex flex-col items-left  w-full md:w-5/6 p-4">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <h1 className="font-bold text-3xl">Events</h1>
              {/* <AdminLink> */}
                <Link to="/create-event">
                  <MdOutlineCreateNewFolder size={25} />
                </Link>
              {/* </AdminLink> */}
            </div>

            <div className="p-4">
              <h1 className="text-3xl">Upcoming Events</h1>
              <div className=" p-6 rounded-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events?.length > 0 ? (
                  events.map((event) => (
                    <div
                      key={event._id}
                      className="w-full bg-green-100 p-4 border rounded-lg cursor-pointer"
                    >
                      <img
                        src={event.photo}
                        alt={event.title}
                        className="rounded-lg  h-[160px] w-full "
                      />
                      <p className="mt-4">{event.title}</p>
                      <p className="text-gray-700 border-b py-2">
                        {event.description.length > 100
                          ? `${event.description.substring(0, 100)}...`
                          : event.description}
                      </p>
                      <div className="flex items-center justify-between my-3 border-b py-2">
                        <p className="text-sm">
                          Date: {new Date(event.date).toLocaleDateString()}
                        </p>
                        <Link
                          to={`/event/${event._id}`}
                          className="text-sm underline"
                        >
                          View Details
                        </Link>
                      </div>

                      
                    </div>
                  ))
                ) : (
                  <p>No events available.</p>
                )}
              </div>
            </div>

            <div className="p-4">
              <h1 className="text-3xl">Top Trending</h1>
              <div className=" p-6 rounded-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trending?.length > 0 ? (
                  trending.map((event) => (
                    <div
                      key={event._id}
                      className="w-full p-4 border rounded-lg cursor-pointer bg-green-100 "
                     
                    >
                      <p>
                        <MdEventNote size={15} />
                      </p>
                      <p className="mt-4">{event.title}</p>
                      <p className="text-gray-700 border-b py-2">
                        {event.description.length > 100
                          ? `${event.description.substring(0, 100)}...`
                          : event.description}
                      </p>
                      <div className="flex items-center justify-between my-3 border-b py-2">
                        <p className="text-sm">
                          Date: {new Date(event.date).toLocaleDateString()}
                        </p>
                        <Link
                          to={`/event/${event._id}`}
                          className="text-sm underline"
                        >
                          View Details
                        </Link>
                      </div>

                      {/* <div className="flex justify-between mt-2">
                        <button
                          className="px-4 py-2 text-black flex items-center"
                          onClick={() => handleRSVP(event._id)}
                        >
                          <IoIosArrowRoundForward size={20} /> RSVP Now
                        </button>
                      </div> */}
                    </div>
                  ))
                ) : (
                  <p>No events available.</p>
                )}
              </div>
            </div>

            <div className="p-4">
              <h1 className="text-3xl">Past Events</h1>
              <div className=" p-6 rounded-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {past?.length > 0 ? (
                  past.map((event) => (
                    <div
                      key={event._id}
                      className="w-full bg-red-100 p-4 border rounded-lg cursor-pointer"
                    >
                      <p>
                        <MdEventNote size={15} />
                      </p>
                      <p className="mt-4">{event.title}</p>
                      <p className="text-gray-700 border-b py-2">
                        {event.description.length > 100
                          ? `${event.description.substring(0, 100)}...`
                          : event.description}
                      </p>
                      <div className="flex items-center justify-between my-3 border-b py-2">
                        <p className="text-sm">
                          Date: {new Date(event.date).toLocaleDateString()}
                        </p>
                        <Link
                          to={`/event/${event._id}`}
                          className="text-sm underline"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No events available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventList;
