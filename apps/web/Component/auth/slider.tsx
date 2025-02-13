"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import Image from "next/image";
import "swiper/css";
import "swiper/css/autoplay";
import "swiper/css/pagination";
import { Button } from '@repo/ui/button';
import {CornerUpLeft} from "lucide-react";
import { useRouter } from "next/navigation";

function Slider() {
  const router = useRouter()

  return (
    <div className="w-full h-full">
      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{ delay: 3000, disableOnInteraction: false }}
        pagination={{ clickable: true, type: "progressbar" }}
        loop={true}
        speed={800}
        spaceBetween={2}
        className="w-full h-full  rounded-lg overflow-hidden relative"
      >
        <SwiperSlide>
          <Image
            alt="United Nations Space Cover"
            fill
            src="https://assets.weforum.org/article/image/responsive_large_M6WwUWq0RPC7_MW5n6s81wgynwMAkV1RKeJfawkhDDo.jpg"
            className="bject-cover object-center"
            unoptimized
          />
        </SwiperSlide>
        <SwiperSlide>
          <Image
            alt="NASA FY25 Budget Cover"
            fill
            src="https://www.nasa.gov/wp-content/uploads/2024/03/fy25-budget-cover-no-text.png?w=1024"
            className="object-cover object-center"
            unoptimized
          />
        </SwiperSlide>
        <SwiperSlide>
          <Image
            alt="Explore Space"
            fill
            src="https://nationaltoday.com/wp-content/uploads/2022/05/18-Explore-Space.jpg"
            className="object-cover object-left"
            unoptimized
          />
        </SwiperSlide>
        
        <div className="absolute top-2 z-10 right-0 flex px-3">
          <Button size="text-sm" onClickHandler={()=>{
            router.push('/')
          }} className="secondary">
            <div className="flex gap-2 items-center justify-center" >
              <span>Homepage</span> 
              <CornerUpLeft className="text-sm"/>
            </div>
          </Button>
        </div>
      </Swiper>
    </div>
  );
}

export default Slider;
