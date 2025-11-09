// ExcelChange.tsx - 엑셀 파일 자동 편집 페이지

import { Container } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import { Button } from "react-bootstrap";

function ExcelChange() {
  // 초기화

  return (
    <Container>
      {/* 헤더 */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">샘플페이지</h1>
      </div>
      <Button>테스트</Button>
    </Container>
  );
}

export default ExcelChange;
