import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
export default function TicketDetails() {
  const {id}=useParams(); const navigate=useNavigate();
  useEffect(()=>navigate('/user/chat/'+id,{replace:true}),[id]);
  return null;
}
