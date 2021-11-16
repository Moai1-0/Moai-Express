const template = {
    completeReservationApplication(options) {
        const {depositor_name, total_purchase_price} = options
        
        return `[어비] 예약신청 안내\n\n안녕하세요\n\n${depositor_name}님의 예약 신청이 완료되었습니다.\n\n신한 110-534-032944 (하성제)\n\n위 계좌로 ${total_purchase_price}원 입금해주시면 예약이 확정됩니다.`;
    },
    confirmReservation(options) {
        const {
            depositor_name, 
            product_name,
            shop_name,
            total_purchase_quantity,
            total_purchase_price,
            expiry_datetime,
            pickup_start_datetime,
            pickup_end_datetime,
            shop_address,
            return_price
        } = options;

        return `[어비] 예약완료 안내\n\n안녕하세요\n\n${depositor_name}님의 예약이 확정되었습니다.\n\n아래 예약 정보를 확인해 주세요.\n- 제품명 : ${product_name}\n- 가게명 : ${shop_name}\n- 수량 : ${total_purchase_quantity}\n- 금액 : ${total_purchase_price}\n- 예약 마감 시간 : ${expiry_datetime}\n\n예약 마감 시간 이후 수령/환급 안내 메세지를 발송해드리겠습니다.\n\n— 수령 시 —\n\n- 수령 가능 시간\n${pickup_start_datetime} ~ ${pickup_end_datetime}\n\n- 수령지 주소\n${shop_address}\n\n— 환급 시 —\n\n- 환급금\n개당 ${return_price}\n\n오늘도 어비 서비스를 이용해주셔서 감사합니다`;
    },
    confirmReturn(options) {
        const {
            depositor_name, 
            product_name,
            total_purchase_quantity,
            shop_name,
            total_return_price
        } = options;

        return `[어비] 상품환급 안내\n\n${depositor_name}님 ${total_purchase_quantity}개 예약하신 [${product_name}] 상품이 매진되었습니다.\n\n${shop_name} 사장님께서 고객님의 예약에 감사함을 표시하기 위해 ${total_return_price}원(예약금+환급금)을 환급해드릴게요!\n\n환급금은 빠른 시간 내로 고객님의 통장에 입금될 예정입니다(최대 하루 소요).\n\n이용해주셔서 감사합니다!`;
    },
    confirmPickUp(options) {
        const {
            depositor_name, 
            product_name,
            total_purchase_quantity,
            pickup_start_datetime,
            pickup_end_datetime,
            shop_name
        } = options;

        return `[어비] 상품수령 안내\n\n${depositor_name}님 ${total_purchase_quantity}개 예약하신 [${product_name}] 상품이 수령 확정되었습니다.\n\n${pickup_start_datetime}시부터 ${pickup_end_datetime}시 사이에 ${shop_name} 매장에 방문해 해당 상품을 수령해주세요!\n\n이용해주셔서 감사합니다!`;
    },
    confirmReturnIsDone(options) {
        const {
            depositor_name,
            total_return_price
        } = options;

        return `[어비] 환급 완료 안내\n\n${depositor_name}님의 계좌에 ${total_return_price}원(예약금+환급금) 환급이 완료되었습니다.\n\n고객님께 최상의 경험을 드리는 어비 서비스가 되겠습니다.\n\n이용해주셔서 감사합니다!`;
    }
}

module.exports = template;