import { useParams } from "react-router-dom";

export default function ProposalDetail() {
  const { id } = useParams();

  return (
    <div style={{padding:"40px"}}>
      <h1>Proposal {id}</h1>

      <p>This is where proposal details will appear.</p>

      <button>Vote Yes</button>
      <button style={{marginLeft:"10px"}}>Vote No</button>
    </div>
  );
}
