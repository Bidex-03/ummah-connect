import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { FiClock, FiDollarSign } from 'react-icons/fi';
import axios from 'axios';
import PageLoader from "../Loader/PageLoader";

const URL = import.meta.env.VITE_APP_BACKEND_URL;

const CourseList = () => {
  const [courses, setCourses] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const pageSize = 10; 

  useEffect(() => {
    fetchCourses(currentPage);
  }, [currentPage]);

  const fetchCourses = async (page) => {
    setLoading(true);
    try {
      const config = {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
			};
      const response = await axios.get(`${URL}/courses/all/paginated?page=${page}&limit=${pageSize}`, config);
      const data =  response.data;
      // console.log(data)
      setCourses(data.courses);
      setTotalPages(data.totalPages);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
        <div className="flex justify-center items-center min-h-screen">
            <PageLoader />
        </div>
    );
}

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">All Courses</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Card key={course._id} className="flex flex-col">
            <CardHeader>
              <img src={course.coverImage} alt={course.title} className="w-full h-48 object-cover rounded-t-lg" />
              <CardTitle className="mt-2">{course.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 line-clamp-2">{course.description}</p>
              <div className="flex justify-between items-center mt-4">
                <div className="flex items-center">
                  <FiClock className="mr-2" />
                  <span>{course.duration} hours</span>
                </div>
                <div className="flex items-center">
                  <FiDollarSign className="mr-2" />
                  <span>{course.price === 0 ? 'Free' : `${course.price.toFixed(2)}`}</span>
                </div>
              </div>
              <div>
                <span className="text-gray-600">Instructor: {`${course.instructor.firstName} ${course.instructor.lastName}`}</span>
              </div>
            </CardContent>
            <CardFooter className="mt-auto">
              <Link to={`/course-info/${course._id}`} className="w-full">
                <Button className="w-full">Learn More</Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
      <Pagination
        className="mt-8"
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default CourseList;
