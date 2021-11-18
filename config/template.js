const template = {
    completeReservationApplication(options) {
        const {depositor_name, total_purchase_price} = options
        
        return `[어비] 예약신청 안내\n\n${depositor_name}님의 예약 신청이 완료되었습니다.\n\n하성제(모아이)\n신한 110-534-032944\n\n위 계좌로 ${total_purchase_price}원 입금해주시면 예약이 확정됩니다.`;
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
            shop_tel,
            return_price
        } = options;

        return `[어비] 예약완료 안내\n\n${depositor_name}님의 예약이 확정되었습니다.\n\n아래 예약 정보를 확인해 주세요.\n\n- 제품명 : ${product_name}\n- 가게명 : ${shop_name}\n- 수량 : ${total_purchase_quantity}개\n- 금액 : ${total_purchase_price}원\n- 예약 마감 시간 : ${expiry_datetime}\n\n예약 마감 시간 이후 수령/환급 안내 메세지를 발송해드리겠습니다.\n\n1) 수령 시\n[수령 가능 시간]\n${pickup_start_datetime} ~ ${pickup_end_datetime}\n[수령지 주소]\n${shop_address}\n[가게 전화번호]\n${shop_tel}\n\n2) 환급 시\n[환급금]\n개당 ${return_price}원`;
    },
    cancelReservation(options) {
        const {
            depositor_name,
            product_name
        } = options;
        return `[어비] 예약취소 안내\\n\\n${depositor_name}님, [${product_name}] 상품 예약이 취소되었습니다.\\n\\n홈페이지에서 재예약 부탁드립니다.\\n\\n오늘도 어비를 이용해주셔서 감사합니다.\\n\\n문의사항이 있을 시 메세지를 보내주시면 신속하게 답장드리겠습니다.`
    },
    confirmReturn(options) {
        const {
            depositor_name, 
            product_name,
            total_purchase_quantity,
            shop_name,
            total_return_price
        } = options;

        return `[어비] 상품환급 안내\n\n${depositor_name}님, ${total_purchase_quantity}개 예약하신 [${product_name}] 상품이 매진되었습니다.\n\n${shop_name} 사장님께서 고객님의 예약에 감사를 표하기 위해 ${total_return_price}원(예약금+환급금)을 환급해드립니다!\n\n환급금은 빠른 시간 내로 고객님의 통장에 입금될 예정입니다(최대 하루 소요).\n\n이용해주셔서 감사합니다!`;
    },
    confirmPickUp(options) {
        const {
            depositor_name, 
            product_name,
            total_purchase_quantity,
            pickup_start_datetime,
            pickup_end_datetime,
            shop_name,
            shop_address,
            shop_tel
        } = options;

        return `[어비] 상품수령 안내\n\n${depositor_name}님, ${total_purchase_quantity}개 예약하신 [${product_name}] 상품이 수령 확정되었습니다.\n\n${pickup_start_datetime}시부터 ${pickup_end_datetime}시 사이에 ${shop_name} 매장에 방문해 해당 상품을 수령해주세요!\n\n[수령지 주소]\n${shop_address}\n[가게 전화번호]\n${shop_tel}\n\n이용해주셔서 감사합니다!`;
    },
    confirmReturnIsDone(options) {
        const {
            depositor_name,
            total_return_price
        } = options;

        return `[어비] 환급 완료 안내\n\n${depositor_name}님의 계좌에 ${total_return_price}원(예약금+환급금) 환급이 완료되었습니다.\n\n고객님께 최상의 경험을 드리는 어비가 되겠습니다.\n\n이용해주셔서 감사합니다!`;
    }
}

module.exports = template;